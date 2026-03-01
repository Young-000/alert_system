import { computeCheckpointKey, MIN_SHARED_CHECKPOINTS, MIN_NEIGHBORS_FOR_STATS } from './checkpoint-key.util';

describe('computeCheckpointKey', () => {
  it('subway station: station:{id} 형태로 반환한다', () => {
    expect(computeCheckpointKey({
      linkedStationId: 'uuid-station-1',
      name: '강남역',
      checkpointType: 'subway',
    })).toBe('station:uuid-station-1');
  });

  it('bus stop: bus:{id} 형태로 반환한다', () => {
    expect(computeCheckpointKey({
      linkedBusStopId: 'bus-stop-123',
      name: '강남역 정류장',
      checkpointType: 'bus_stop',
    })).toBe('bus:bus-stop-123');
  });

  it('subway station이 bus stop보다 우선한다', () => {
    expect(computeCheckpointKey({
      linkedStationId: 'uuid-station-1',
      linkedBusStopId: 'bus-stop-123',
      name: '강남역',
      checkpointType: 'subway',
    })).toBe('station:uuid-station-1');
  });

  it('linked ID 없으면 name:normalized:type 형태로 반환한다', () => {
    expect(computeCheckpointKey({
      name: '강남역',
      checkpointType: 'subway',
    })).toBe('name:강남역:subway');
  });

  it('이름을 lowercase, trim, 공백 제거하여 정규화한다', () => {
    expect(computeCheckpointKey({
      name: '  Gangnam Station  ',
      checkpointType: 'custom',
    })).toBe('name:gangnamstation:custom');
  });

  it('null linkedStationId는 무시한다', () => {
    expect(computeCheckpointKey({
      linkedStationId: null,
      name: '회사',
      checkpointType: 'work',
    })).toBe('name:회사:work');
  });

  it('빈 문자열 linkedStationId는 사용한다', () => {
    // 빈 문자열은 falsy이므로 무시됨
    expect(computeCheckpointKey({
      linkedStationId: '',
      name: '회사',
      checkpointType: 'work',
    })).toBe('name:회사:work');
  });

  it('공백이 여러 개인 이름을 정규화한다', () => {
    expect(computeCheckpointKey({
      name: '강 남  역',
      checkpointType: 'subway',
    })).toBe('name:강남역:subway');
  });
});

describe('constants', () => {
  it('MIN_SHARED_CHECKPOINTS는 2이다', () => {
    expect(MIN_SHARED_CHECKPOINTS).toBe(2);
  });

  it('MIN_NEIGHBORS_FOR_STATS는 3이다', () => {
    expect(MIN_NEIGHBORS_FOR_STATS).toBe(3);
  });
});
