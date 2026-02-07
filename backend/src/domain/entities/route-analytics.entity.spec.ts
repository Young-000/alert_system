import {
  RouteAnalytics,
  SegmentStats,
  ConditionAnalysis,
  ScoreFactors,
} from './route-analytics.entity';

describe('RouteAnalytics Entity', () => {
  const mockSegmentStats: SegmentStats[] = [
    {
      checkpointName: '강남역',
      transportMode: 'subway',
      averageDuration: 15,
      minDuration: 12,
      maxDuration: 20,
      variability: 'stable',
      sampleCount: 10,
    },
    {
      checkpointName: '선릉역',
      transportMode: 'subway',
      averageDuration: 25,
      minDuration: 20,
      maxDuration: 35,
      variability: 'variable',
      sampleCount: 10,
    },
  ];

  const mockConditionAnalysis: ConditionAnalysis = {
    byWeather: {
      '맑음': { avgDuration: 40, count: 5 },
      '비': { avgDuration: 50, count: 3 },
    },
    byDayOfWeek: {
      '월요일': { avgDuration: 45, count: 4 },
      '화요일': { avgDuration: 42, count: 3 },
    },
    byTimeSlot: {
      '출근 시간 (6-9시)': { avgDuration: 48, count: 6 },
      '오전 (9-12시)': { avgDuration: 35, count: 2 },
    },
  };

  const mockScoreFactors: ScoreFactors = {
    speed: 85,
    reliability: 75,
    comfort: 70,
  };

  describe('생성자', () => {
    it('기본값으로 RouteAnalytics를 생성해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '출근 경로');

      expect(analytics.routeId).toBe('route-1');
      expect(analytics.routeName).toBe('출근 경로');
      expect(analytics.totalTrips).toBe(0);
      expect(analytics.duration.average).toBe(0);
      expect(analytics.score).toBe(0);
    });

    it('모든 옵션으로 RouteAnalytics를 생성해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '출근 경로', {
        totalTrips: 20,
        lastTripDate: new Date('2026-02-01'),
        duration: {
          average: 45,
          min: 38,
          max: 55,
          stdDev: 5.2,
        },
        segmentStats: mockSegmentStats,
        conditionAnalysis: mockConditionAnalysis,
        score: 78,
        scoreFactors: mockScoreFactors,
      });

      expect(analytics.totalTrips).toBe(20);
      expect(analytics.duration.average).toBe(45);
      expect(analytics.duration.min).toBe(38);
      expect(analytics.duration.max).toBe(55);
      expect(analytics.duration.stdDev).toBe(5.2);
      expect(analytics.segmentStats).toHaveLength(2);
      expect(analytics.score).toBe(78);
      expect(analytics.scoreFactors.speed).toBe(85);
    });
  });

  describe('getGrade()', () => {
    it.each([
      [90, 'S'],
      [85, 'A'],
      [75, 'B'],
      [60, 'C'],
      [50, 'D'],
      [30, 'D'],
    ])('점수 %i는 등급 %s를 반환해야 한다', (score, expectedGrade) => {
      const analytics = new RouteAnalytics('route-1', '경로', { score });
      expect(analytics.getGrade()).toBe(expectedGrade);
    });
  });

  describe('getVariabilityText()', () => {
    // 실제 구현: stdDevRatio = stdDev / average
    // < 0.1: "매우 일관됨", < 0.2: "대체로 일관됨", < 0.3: "변동 있음", else: "변동이 큼"

    it('비율이 0.1 미만이면 "매우 일관됨"을 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        duration: { average: 40, min: 35, max: 45, stdDev: 3 }, // 3/40 = 0.075
      });
      expect(analytics.getVariabilityText()).toBe('매우 일관됨');
    });

    it('비율이 0.1-0.2이면 "대체로 일관됨"을 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        duration: { average: 40, min: 30, max: 50, stdDev: 6 }, // 6/40 = 0.15
      });
      expect(analytics.getVariabilityText()).toBe('대체로 일관됨');
    });

    it('비율이 0.2-0.3이면 "변동 있음"을 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        duration: { average: 40, min: 25, max: 60, stdDev: 10 }, // 10/40 = 0.25
      });
      expect(analytics.getVariabilityText()).toBe('변동 있음');
    });

    it('비율이 0.3 이상이면 "변동이 큼"을 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        duration: { average: 40, min: 20, max: 70, stdDev: 15 }, // 15/40 = 0.375
      });
      expect(analytics.getVariabilityText()).toBe('변동이 큼');
    });
  });

  describe('isRecommended()', () => {
    // 실제 구현: score >= 70 만 체크

    it('점수가 70 이상이면 추천해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        score: 75,
      });
      expect(analytics.isRecommended()).toBe(true);
    });

    it('점수가 70 미만이면 추천하지 않아야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        score: 65,
      });
      expect(analytics.isRecommended()).toBe(false);
    });

    it('점수가 정확히 70이면 추천해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        score: 70,
      });
      expect(analytics.isRecommended()).toBe(true);
    });
  });

  describe('getSummary()', () => {
    it('측정 데이터가 없으면 적절한 메시지를 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', { totalTrips: 0 });
      expect(analytics.getSummary()).toBe('측정 데이터가 없습니다');
    });

    it('측정 데이터가 있으면 요약 문구를 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '출근 경로', {
        totalTrips: 15,
        duration: { average: 42, min: 35, max: 50, stdDev: 3 },
      });
      const summary = analytics.getSummary();
      expect(summary).toContain('평균');
      expect(summary).toContain('42분');
      expect(summary).toContain('15회 측정');
    });
  });

  describe('getSlowestSegment()', () => {
    it('가장 느린 구간을 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로', {
        segmentStats: mockSegmentStats,
      });
      const slowest = analytics.getSlowestSegment();
      expect(slowest?.checkpointName).toBe('선릉역');
      expect(slowest?.averageDuration).toBe(25);
    });

    it('구간이 없으면 undefined를 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '경로');
      expect(analytics.getSlowestSegment()).toBeUndefined();
    });
  });

  describe('toComparisonData()', () => {
    it('비교용 데이터를 반환해야 한다', () => {
      const analytics = new RouteAnalytics('route-1', '출근 경로', {
        totalTrips: 10,
        score: 85,
        duration: { average: 42.5, min: 35, max: 50, stdDev: 5 },
        scoreFactors: { speed: 80, reliability: 90, comfort: 75 },
      });

      const data = analytics.toComparisonData();

      expect(data.routeId).toBe('route-1');
      expect(data.routeName).toBe('출근 경로');
      expect(data.avgDuration).toBe(43); // rounded
      expect(data.totalScore).toBe(85);
      expect(data.grade).toBe('A');
    });
  });
});
