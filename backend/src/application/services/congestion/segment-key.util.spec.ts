import { normalizeSegmentKey } from './segment-key.util';

describe('normalizeSegmentKey', () => {
  describe('Priority 1: linkedStationId', () => {
    it('같은 linkedStationId를 가진 체크포인트는 같은 키를 반환한다', () => {
      const key1 = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림역',
        checkpointType: 'subway',
        lineInfo: '2호선',
      });
      const key2 = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림',
        checkpointType: 'subway',
        lineInfo: '2호선',
      });
      expect(key1).toBe(key2);
    });

    it('linkedStationId가 있으면 station_ 접두사 키를 생성한다', () => {
      const key = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림역',
        checkpointType: 'subway',
        lineInfo: '2호선',
      });
      expect(key).toBe('station_ST001_2호선');
    });

    it('linkedStationId가 있고 lineInfo가 없으면 lineInfo 없이 키를 생성한다', () => {
      const key = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림역',
        checkpointType: 'subway',
      });
      expect(key).toBe('station_ST001');
    });

    it('같은 역이라도 다른 노선이면 다른 키를 반환한다', () => {
      const key2 = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림역',
        checkpointType: 'subway',
        lineInfo: '2호선',
      });
      const key7 = normalizeSegmentKey({
        linkedStationId: 'ST001',
        name: '신도림역',
        checkpointType: 'subway',
        lineInfo: '7호선',
      });
      expect(key2).not.toBe(key7);
    });
  });

  describe('Priority 2: linkedBusStopId', () => {
    it('같은 linkedBusStopId를 가진 체크포인트는 같은 키를 반환한다', () => {
      const key1 = normalizeSegmentKey({
        linkedBusStopId: 'BUS123',
        name: '강남역 정류장',
        checkpointType: 'bus_stop',
      });
      const key2 = normalizeSegmentKey({
        linkedBusStopId: 'BUS123',
        name: '강남역정류장',
        checkpointType: 'bus_stop',
      });
      expect(key1).toBe(key2);
    });

    it('linkedBusStopId가 있으면 bus_ 접두사 키를 생성한다', () => {
      const key = normalizeSegmentKey({
        linkedBusStopId: 'BUS123',
        name: '강남역 정류장',
        checkpointType: 'bus_stop',
      });
      expect(key).toBe('bus_BUS123');
    });

    it('linkedStationId가 null이면 linkedBusStopId를 사용한다', () => {
      const key = normalizeSegmentKey({
        linkedStationId: null,
        linkedBusStopId: 'BUS456',
        name: '테스트 정류장',
        checkpointType: 'bus_stop',
      });
      expect(key).toBe('bus_BUS456');
    });
  });

  describe('Priority 3: name fallback', () => {
    it('ID가 없으면 이름 기반 키를 생성한다', () => {
      const key = normalizeSegmentKey({
        name: '신도림역',
        checkpointType: 'subway',
        lineInfo: '2호선',
      });
      expect(key).toBe('name_신도림_2호선');
    });

    it('이름에서 "역" 접미사를 제거한다', () => {
      const key1 = normalizeSegmentKey({
        name: '강남역',
        checkpointType: 'subway',
      });
      const key2 = normalizeSegmentKey({
        name: '강남',
        checkpointType: 'subway',
      });
      expect(key1).toBe(key2);
    });

    it('이름에서 "정류장" 접미사를 제거한다', () => {
      const key1 = normalizeSegmentKey({
        name: '서울역 정류장',
        checkpointType: 'bus_stop',
      });
      const key2 = normalizeSegmentKey({
        name: '서울역',
        checkpointType: 'bus_stop',
      });
      // 공백 제거 후 비교: '서울역정류장' vs '서울역' - 정류장은 제거됨
      // 하지만 '역'도 남아 있으므로 두 번째 체크포인트에서도 '서울' 이 됨
      // key1: 서울역정류장 -> 서울역 (정류장 제거) -> 서울 (역 제거) = name_서울
      // key2: 서울역 -> 서울 (역 제거) = name_서울
      expect(key1).toBe(key2);
    });

    it('이름에서 "정류소" 접미사를 제거한다', () => {
      const key1 = normalizeSegmentKey({
        name: '강남정류소',
        checkpointType: 'bus_stop',
      });
      const key2 = normalizeSegmentKey({
        name: '강남',
        checkpointType: 'bus_stop',
      });
      expect(key1).toBe(key2);
    });

    it('공백과 대소문자를 무시한다', () => {
      const key1 = normalizeSegmentKey({
        name: ' Test Station ',
        checkpointType: 'custom',
      });
      const key2 = normalizeSegmentKey({
        name: 'teststation',
        checkpointType: 'custom',
      });
      expect(key1).toBe(key2);
    });

    it('lineInfo가 없으면 이름만으로 키를 생성한다', () => {
      const key = normalizeSegmentKey({
        name: '집',
        checkpointType: 'home',
      });
      expect(key).toBe('name_집');
    });
  });

  describe('Edge cases', () => {
    it('linkedStationId가 빈 문자열이면 다음 우선순위를 사용한다', () => {
      const key = normalizeSegmentKey({
        linkedStationId: '',
        linkedBusStopId: 'BUS789',
        name: '테스트',
        checkpointType: 'bus_stop',
      });
      expect(key).toBe('bus_BUS789');
    });

    it('undefined ID는 null처럼 처리된다', () => {
      const key = normalizeSegmentKey({
        linkedStationId: undefined,
        linkedBusStopId: undefined,
        name: '테스트역',
        checkpointType: 'subway',
        lineInfo: null,
      });
      expect(key).toBe('name_테스트');
    });
  });
});
