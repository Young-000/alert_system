import { describe, it, expect } from 'vitest';
import { resolvePreferredFlag, buildCheckpoints, buildUpdateRouteDto } from './route-payload';
import type { CheckpointResponse } from '@infrastructure/api/commute-api.client';
import type { SelectedStop } from './types';

describe('resolvePreferredFlag', () => {
  describe('새 경로를 만들 때', () => {
    it('첫 경로는 대표로 지정한다', () => {
      expect(resolvePreferredFlag({ isEditing: false, existingRouteCount: 0 })).toBe(true);
    });

    it('이미 경로가 있으면 대표로 올리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: false, existingRouteCount: 2 })).toBe(false);
    });
  });

  describe('기존 경로를 수정할 때', () => {
    // 서버는 isPreferred를 안 보내면 기존 값을 보존한다(dto.isPreferred ?? existing).
    // false를 실어 보내면 사용자가 지정한 대표가 소리 없이 풀린다.
    it('대표 여부를 건드리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: true, existingRouteCount: 2 })).toBeUndefined();
    });

    it('경로가 하나뿐이어도 건드리지 않는다', () => {
      expect(resolvePreferredFlag({ isEditing: true, existingRouteCount: 1 })).toBeUndefined();
    });
  });
});

// ---------- 수정 페이로드: 체크포인트 id 보존 + userId 미포함 ----------

const existingCheckpoints: CheckpointResponse[] = [
  {
    id: 'cp-home',
    sequenceOrder: 1,
    name: '집',
    checkpointType: 'home',
    expectedWaitTime: 0,
    totalExpectedTime: 0,
    isTransferRelated: false,
  },
  {
    id: 'cp-station',
    sequenceOrder: 2,
    name: '강남역',
    checkpointType: 'subway',
    linkedStationId: 'station-1',
    lineInfo: '2호선',
    expectedWaitTime: 3,
    totalExpectedTime: 20,
    isTransferRelated: false,
  },
  {
    id: 'cp-work',
    sequenceOrder: 3,
    name: '회사',
    checkpointType: 'work',
    expectedWaitTime: 0,
    totalExpectedTime: 10,
    isTransferRelated: false,
  },
];

const editedStop: SelectedStop = {
  id: 'station-1',
  uniqueKey: 'edit-station-1-0',
  name: '강남역',
  line: '2호선',
  transportMode: 'subway',
  checkpointId: 'cp-station',
};

describe('buildCheckpoints', () => {
  // id 없는 체크포인트는 서버가 삭제→재삽입하고, ON DELETE CASCADE로
  // 그 체크포인트의 도착 기록(checkpoint_records)이 전부 사라진다.
  it('편집 시 정거장의 기존 checkpointId를 보존한다', () => {
    const result = buildCheckpoints([editedStop], 'morning', existingCheckpoints);
    expect(result[1].id).toBe('cp-station');
  });

  it('집/회사 체크포인트는 checkpointType으로 기존 id를 찾아 보존한다', () => {
    const result = buildCheckpoints([editedStop], 'morning', existingCheckpoints);
    expect(result[0]).toMatchObject({ checkpointType: 'home', id: 'cp-home' });
    expect(result[2]).toMatchObject({ checkpointType: 'work', id: 'cp-work' });
  });

  it('퇴근 경로는 회사가 먼저 와도 유형 매칭으로 id를 보존한다', () => {
    const result = buildCheckpoints([editedStop], 'evening', existingCheckpoints);
    expect(result[0]).toMatchObject({ checkpointType: 'work', id: 'cp-work' });
    expect(result[result.length - 1]).toMatchObject({ checkpointType: 'home', id: 'cp-home' });
  });

  it('새로 추가한 정거장은 id 없이 만든다', () => {
    const newStop: SelectedStop = {
      id: 'station-9',
      uniqueKey: 'new-station-9-1',
      name: '역삼역',
      line: '2호선',
      transportMode: 'subway',
    };
    const result = buildCheckpoints([editedStop, newStop], 'morning', existingCheckpoints);
    expect(result[2].id).toBeUndefined();
  });

  it('생성 시(기존 체크포인트 없음)에는 어떤 id도 담지 않는다', () => {
    const result = buildCheckpoints([editedStop], 'morning');
    expect(result.every((cp) => cp.id === undefined)).toBe(true);
  });
});

describe('buildUpdateRouteDto', () => {
  // 서버 UpdateRouteDto에는 userId가 없고 전역 파이프가 forbidNonWhitelisted라
  // userId를 실으면 경로 수정 요청 전체가 400이 된다.
  it('userId를 담지 않는다', () => {
    const dto = buildUpdateRouteDto({
      name: '수정된 경로',
      routeType: 'morning',
      stops: [editedStop],
      existingCheckpoints,
    });
    expect(Object.keys(dto)).not.toContain('userId');
  });

  it('이름·유형·id 보존 체크포인트로 구성된다', () => {
    const dto = buildUpdateRouteDto({
      name: '수정된 경로',
      routeType: 'morning',
      stops: [editedStop],
      existingCheckpoints,
    });
    expect(dto.name).toBe('수정된 경로');
    expect(dto.routeType).toBe('morning');
    expect(dto.checkpoints?.map((cp) => cp.id)).toEqual(['cp-home', 'cp-station', 'cp-work']);
  });

  it('isPreferred는 담지 않는다 (서버가 기존 값을 보존)', () => {
    const dto = buildUpdateRouteDto({
      name: '수정된 경로',
      routeType: 'morning',
      stops: [editedStop],
      existingCheckpoints,
    });
    expect('isPreferred' in dto ? dto.isPreferred : undefined).toBeUndefined();
  });
});
