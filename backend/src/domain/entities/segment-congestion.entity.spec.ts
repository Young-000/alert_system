import { SegmentCongestion } from './segment-congestion.entity';

describe('SegmentCongestion', () => {
  describe('determineCongestionLevel', () => {
    it('지연 < 2분이면 low를 반환한다', () => {
      expect(SegmentCongestion.determineCongestionLevel(1.5)).toBe('low');
    });

    it('지연 0분이면 low를 반환한다', () => {
      expect(SegmentCongestion.determineCongestionLevel(0)).toBe('low');
    });

    it('지연 2~5분이면 moderate를 반환한다', () => {
      expect(SegmentCongestion.determineCongestionLevel(3)).toBe('moderate');
    });

    it('지연 5~10분이면 high를 반환한다', () => {
      expect(SegmentCongestion.determineCongestionLevel(7)).toBe('high');
    });

    it('지연 > 10분이면 severe를 반환한다', () => {
      expect(SegmentCongestion.determineCongestionLevel(15)).toBe('severe');
    });

    it('음수 지연은 low를 반환한다 (빨리 도착)', () => {
      expect(SegmentCongestion.determineCongestionLevel(-5)).toBe('low');
    });

    describe('ratio 기반 판단 (expectedWaitTime 제공 시)', () => {
      it('ratio < 0.2이면 low를 반환한다', () => {
        // 1분 지연 / 10분 예상 = 0.1 ratio
        expect(SegmentCongestion.determineCongestionLevel(1, 10)).toBe('low');
      });

      it('ratio 0.2~0.5이면 moderate를 반환한다', () => {
        // 절대값은 low(1.5분) 이지만 ratio가 0.3이면 moderate
        expect(SegmentCongestion.determineCongestionLevel(1.5, 5)).toBe('moderate');
      });

      it('ratio 0.5~1.0이면 high를 반환한다', () => {
        // 절대값은 moderate(4분) 이지만 ratio가 0.8이면 high
        expect(SegmentCongestion.determineCongestionLevel(4, 5)).toBe('high');
      });

      it('ratio > 1.0이면 severe를 반환한다', () => {
        // 절대값은 high(6분) 이지만 ratio가 1.2이면 severe
        expect(SegmentCongestion.determineCongestionLevel(6, 5)).toBe('severe');
      });

      it('절대값이 더 높으면 절대값 기준이 우선한다', () => {
        // ratio = 0.05 (low) 이지만 절대값 = 11분 (severe)
        expect(SegmentCongestion.determineCongestionLevel(11, 200)).toBe('severe');
      });
    });
  });

  describe('isStale', () => {
    it('30일 이내 업데이트면 stale이 아니다', () => {
      const congestion = new SegmentCongestion({
        segmentKey: 'test',
        checkpointName: 'test',
        checkpointType: 'subway',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 5,
        avgDelayMinutes: 3,
        stdDevMinutes: 1,
        sampleCount: 10,
        congestionLevel: 'moderate',
        confidence: 0.7,
        lastUpdatedAt: new Date(),
      });
      expect(congestion.isStale()).toBe(false);
    });

    it('30일 이상 지났으면 stale이다', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const congestion = new SegmentCongestion({
        segmentKey: 'test',
        checkpointName: 'test',
        checkpointType: 'subway',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 5,
        avgDelayMinutes: 3,
        stdDevMinutes: 1,
        sampleCount: 10,
        congestionLevel: 'moderate',
        confidence: 0.7,
        lastUpdatedAt: thirtyOneDaysAgo,
      });
      expect(congestion.isStale()).toBe(true);
    });
  });

  describe('hasMinimumSamples', () => {
    it('3개 이상의 샘플이면 true를 반환한다', () => {
      const congestion = new SegmentCongestion({
        segmentKey: 'test',
        checkpointName: 'test',
        checkpointType: 'subway',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 5,
        avgDelayMinutes: 3,
        stdDevMinutes: 1,
        sampleCount: 3,
        congestionLevel: 'moderate',
        confidence: 0.5,
      });
      expect(congestion.hasMinimumSamples()).toBe(true);
    });

    it('3개 미만이면 false를 반환한다', () => {
      const congestion = new SegmentCongestion({
        segmentKey: 'test',
        checkpointName: 'test',
        checkpointType: 'subway',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 5,
        avgDelayMinutes: 3,
        stdDevMinutes: 1,
        sampleCount: 2,
        congestionLevel: 'moderate',
        confidence: 0.4,
      });
      expect(congestion.hasMinimumSamples()).toBe(false);
    });

    it('0개이면 false를 반환한다', () => {
      const congestion = new SegmentCongestion({
        segmentKey: 'test',
        checkpointName: 'test',
        checkpointType: 'subway',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 0,
        avgDelayMinutes: 0,
        stdDevMinutes: 0,
        sampleCount: 0,
        congestionLevel: 'moderate',
        confidence: 0.3,
      });
      expect(congestion.hasMinimumSamples()).toBe(false);
    });
  });

  describe('constructor', () => {
    it('기본값으로 엔티티를 생성한다', () => {
      const congestion = new SegmentCongestion({
        segmentKey: 'station_ST001_2호선',
        checkpointName: '신도림역',
        checkpointType: 'subway',
        lineInfo: '2호선',
        linkedStationId: 'ST001',
        timeSlot: 'morning_rush',
        avgWaitMinutes: 7.2,
        avgDelayMinutes: 4.8,
        stdDevMinutes: 2.1,
        sampleCount: 23,
        congestionLevel: 'high',
        confidence: 0.78,
      });

      expect(congestion.segmentKey).toBe('station_ST001_2호선');
      expect(congestion.checkpointName).toBe('신도림역');
      expect(congestion.congestionLevel).toBe('high');
      expect(congestion.sampleCount).toBe(23);
      expect(congestion.id).toBe('');
      expect(congestion.lastUpdatedAt).toBeInstanceOf(Date);
      expect(congestion.createdAt).toBeInstanceOf(Date);
    });
  });
});
