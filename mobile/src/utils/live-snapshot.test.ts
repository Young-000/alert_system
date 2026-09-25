import { describe, expect, it } from 'vitest';

import { selectLiveSnapshot } from './live-snapshot';

import type {
  SmartDepartureSnapshotDto,
  SnapshotStatus,
} from '@/types/smart-departure';

const NOW = new Date('2026-09-26T08:00:00.000Z').getTime();

function snapshot(
  overrides: Partial<SmartDepartureSnapshotDto> &
    Pick<SmartDepartureSnapshotDto, 'optimalDepartureAt'>,
): SmartDepartureSnapshotDto {
  return {
    id: overrides.settingId ?? 'snap-1',
    settingId: 'setting-1',
    departureType: 'commute',
    departureDate: '2026-09-26',
    arrivalTarget: '09:00',
    estimatedTravelMin: 30,
    prepTimeMinutes: 10,
    minutesUntilDeparture: 0,
    status: 'scheduled',
    alertsSent: [],
    calculatedAt: '2026-09-26T07:00:00.000Z',
    updatedAt: '2026-09-26T07:00:00.000Z',
    ...overrides,
  };
}

/** NOW 기준 n분 뒤(음수면 전) 출발하는 스냅샷. */
function atMinutes(
  minutes: number,
  overrides: Partial<SmartDepartureSnapshotDto> = {},
): SmartDepartureSnapshotDto {
  return snapshot({
    optimalDepartureAt: new Date(NOW + minutes * 60_000).toISOString(),
    ...overrides,
  });
}

describe('selectLiveSnapshot', () => {
  describe('다음 출발 고르기', () => {
    it('아직 오지 않은 출발 중 가장 이른 것을 고른다', () => {
      const result = selectLiveSnapshot(
        {
          commute: atMinutes(120, { settingId: 'late' }),
          return: atMinutes(20, { departureType: 'return', settingId: 'soon' }),
        },
        NOW,
      );

      expect(result?.settingId).toBe('soon');
    });

    it('출발 직후 30분 이내는 아직 유지한다 (조기 전환 방지)', () => {
      const result = selectLiveSnapshot(
        {
          commute: atMinutes(-10, { settingId: 'just-left' }),
          return: atMinutes(300, { departureType: 'return', settingId: 'later' }),
        },
        NOW,
      );

      expect(result?.settingId).toBe('just-left');
    });

    it('전부 지났으면 가장 최근 출발을 고른다', () => {
      const result = selectLiveSnapshot(
        {
          commute: atMinutes(-600, { settingId: 'oldest' }),
          return: atMinutes(-120, { departureType: 'return', settingId: 'recent' }),
        },
        NOW,
      );

      expect(result?.settingId).toBe('recent');
    });

    it('스냅샷이 없으면 null', () => {
      expect(selectLiveSnapshot({}, NOW)).toBeNull();
    });
  });

  /**
   * 서버 위젯은 `scheduled | notified` 만 내보낸다
   * (`calculate-departure.use-case.ts` `getWidgetDepartureData`).
   * 그런데 `GET /smart-departure/today` 는 상태를 거르지 않으므로
   * (`getTodayDeparture` — status 필터 없음, `findTodayByUserId` 도 없음)
   * 취소·만료·출발완료 스냅샷이 그대로 내려온다.
   */
  describe('죽은 스냅샷은 Live Activity 로 띄우지 않는다', () => {
    const DEAD: SnapshotStatus[] = ['cancelled', 'expired', 'departed'];

    it.each(DEAD)('%s 상태는 고르지 않는다', (status) => {
      const result = selectLiveSnapshot(
        { commute: atMinutes(20, { status, settingId: 'dead' }) },
        NOW,
      );

      expect(result).toBeNull();
    });

    it('취소된 출발 대신 살아 있는 출발을 고른다', () => {
      const result = selectLiveSnapshot(
        {
          commute: atMinutes(20, { status: 'cancelled', settingId: 'cancelled' }),
          return: atMinutes(90, {
            departureType: 'return',
            status: 'scheduled',
            settingId: 'alive',
          }),
        },
        NOW,
      );

      expect(result?.settingId).toBe('alive');
    });

    it('notified 는 살아 있는 상태다', () => {
      const result = selectLiveSnapshot(
        { commute: atMinutes(5, { status: 'notified', settingId: 'notified' }) },
        NOW,
      );

      expect(result?.settingId).toBe('notified');
    });

    it('전부 지났을 때의 폴백도 죽은 스냅샷을 되살리지 않는다', () => {
      const result = selectLiveSnapshot(
        {
          commute: atMinutes(-120, { status: 'cancelled', settingId: 'dead' }),
          return: atMinutes(-60, {
            departureType: 'return',
            status: 'expired',
            settingId: 'also-dead',
          }),
        },
        NOW,
      );

      expect(result).toBeNull();
    });
  });
});
