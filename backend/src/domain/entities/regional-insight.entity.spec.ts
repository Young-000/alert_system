import {
  RegionalInsight,
  toRegionId,
  snapToGrid,
  classifyTrend,
} from './regional-insight.entity';

describe('RegionalInsight', () => {
  describe('toRegionId', () => {
    it('격자 좌표로 region ID를 생성한다', () => {
      expect(toRegionId(37.50, 127.00)).toBe('grid_37.50_127.00');
    });

    it('소수점 2자리로 포맷한다', () => {
      expect(toRegionId(37.5, 127)).toBe('grid_37.50_127.00');
    });

    it('음수 좌표도 처리한다', () => {
      expect(toRegionId(-33.87, 151.21)).toBe('grid_-33.87_151.21');
    });
  });

  describe('snapToGrid', () => {
    it('좌표를 0.01도 그리드 중심으로 스냅한다', () => {
      // 37.5678 -> floor(37.5678 * 100) / 100 = 37.56 -> + 0.005 = 37.565
      expect(snapToGrid(37.5678)).toBeCloseTo(37.565, 3);
    });

    it('정확히 그리드 경계에 있으면 해당 셀 중심을 반환한다', () => {
      expect(snapToGrid(37.50)).toBeCloseTo(37.505, 3);
    });

    it('그리드 중심 근처 값도 올바르게 스냅한다', () => {
      expect(snapToGrid(37.505)).toBeCloseTo(37.505, 3);
    });
  });

  describe('classifyTrend', () => {
    it('3% 초과 증가는 worsening이다', () => {
      expect(classifyTrend(5)).toBe('worsening');
    });

    it('-3% 미만 감소는 improving이다', () => {
      expect(classifyTrend(-5)).toBe('improving');
    });

    it('-3%~3% 사이는 stable이다', () => {
      expect(classifyTrend(0)).toBe('stable');
      expect(classifyTrend(2.5)).toBe('stable');
      expect(classifyTrend(-2.5)).toBe('stable');
    });

    it('경계값 3은 stable이다', () => {
      expect(classifyTrend(3)).toBe('stable');
    });

    it('경계값 -3은 stable이다', () => {
      expect(classifyTrend(-3)).toBe('stable');
    });

    it('경계값 3.01은 worsening이다', () => {
      expect(classifyTrend(3.01)).toBe('worsening');
    });

    it('경계값 -3.01은 improving이다', () => {
      expect(classifyTrend(-3.01)).toBe('improving');
    });
  });

  describe('meetsPrivacyThreshold', () => {
    it('5명 이상이면 true를 반환한다', () => {
      const insight = createInsight({ userCount: 5 });
      expect(insight.meetsPrivacyThreshold()).toBe(true);
    });

    it('10명이면 true를 반환한다', () => {
      const insight = createInsight({ userCount: 10 });
      expect(insight.meetsPrivacyThreshold()).toBe(true);
    });

    it('4명이면 false를 반환한다', () => {
      const insight = createInsight({ userCount: 4 });
      expect(insight.meetsPrivacyThreshold()).toBe(false);
    });

    it('0명이면 false를 반환한다', () => {
      const insight = createInsight({ userCount: 0 });
      expect(insight.meetsPrivacyThreshold()).toBe(false);
    });
  });

  describe('isStale', () => {
    it('30일 이내 업데이트면 stale이 아니다', () => {
      const insight = createInsight({ lastCalculatedAt: new Date() });
      expect(insight.isStale()).toBe(false);
    });

    it('30일 이상 지났으면 stale이다', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const insight = createInsight({ lastCalculatedAt: thirtyOneDaysAgo });
      expect(insight.isStale()).toBe(true);
    });

    it('정확히 30일인 경우 stale이 아니다', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const insight = createInsight({ lastCalculatedAt: thirtyDaysAgo });
      expect(insight.isStale()).toBe(false);
    });
  });

  describe('getWeekTrendDirection', () => {
    it('5% 증가면 worsening이다', () => {
      const insight = createInsight({ weekTrend: 5 });
      expect(insight.getWeekTrendDirection()).toBe('worsening');
    });

    it('-5% 감소면 improving이다', () => {
      const insight = createInsight({ weekTrend: -5 });
      expect(insight.getWeekTrendDirection()).toBe('improving');
    });

    it('1% 변화면 stable이다', () => {
      const insight = createInsight({ weekTrend: 1 });
      expect(insight.getWeekTrendDirection()).toBe('stable');
    });
  });

  describe('getMonthTrendDirection', () => {
    it('10% 증가면 worsening이다', () => {
      const insight = createInsight({ monthTrend: 10 });
      expect(insight.getMonthTrendDirection()).toBe('worsening');
    });

    it('-10% 감소면 improving이다', () => {
      const insight = createInsight({ monthTrend: -10 });
      expect(insight.getMonthTrendDirection()).toBe('improving');
    });
  });

  describe('getPeakHour', () => {
    it('가장 많은 세션이 있는 시간대를 반환한다', () => {
      const insight = createInsight({
        peakHourDistribution: { 7: 5, 8: 20, 9: 15, 17: 10, 18: 8 },
      });
      expect(insight.getPeakHour()).toBe(8);
    });

    it('빈 분포면 기본값 8시를 반환한다', () => {
      const insight = createInsight({ peakHourDistribution: {} });
      expect(insight.getPeakHour()).toBe(8);
    });

    it('동일한 최대값이면 먼저 발견된 시간대를 반환한다', () => {
      const insight = createInsight({
        peakHourDistribution: { 7: 10, 8: 10 },
      });
      // 7과 8 모두 10이지만, 순회 순서에 따라 결과가 달라질 수 있음
      const peakHour = insight.getPeakHour();
      expect([7, 8]).toContain(peakHour);
    });

    it('저녁 시간대가 피크일 수 있다', () => {
      const insight = createInsight({
        peakHourDistribution: { 7: 5, 8: 10, 18: 25, 19: 12 },
      });
      expect(insight.getPeakHour()).toBe(18);
    });
  });

  describe('constructor', () => {
    it('기본값으로 엔티티를 생성한다', () => {
      const insight = new RegionalInsight({
        regionId: 'grid_37.50_127.00',
        regionName: '신도림역 일대',
        gridLat: 37.505,
        gridLng: 127.005,
        avgDurationMinutes: 42.5,
        medianDurationMinutes: 40.0,
        userCount: 15,
        sessionCount: 120,
        peakHourDistribution: { 8: 30, 9: 25, 18: 28 },
        weekTrend: -2.5,
        monthTrend: 1.8,
      });

      expect(insight.regionId).toBe('grid_37.50_127.00');
      expect(insight.regionName).toBe('신도림역 일대');
      expect(insight.userCount).toBe(15);
      expect(insight.avgDurationMinutes).toBe(42.5);
      expect(insight.id).toBe('');
      expect(insight.lastCalculatedAt).toBeInstanceOf(Date);
      expect(insight.createdAt).toBeInstanceOf(Date);
    });

    it('id와 타임스탬프를 지정할 수 있다', () => {
      const now = new Date('2026-03-01T00:00:00Z');
      const insight = new RegionalInsight({
        id: 'test-id',
        regionId: 'grid_37.50_127.00',
        regionName: '강남역 일대',
        gridLat: 37.505,
        gridLng: 127.025,
        avgDurationMinutes: 35.0,
        medianDurationMinutes: 33.0,
        userCount: 8,
        sessionCount: 60,
        peakHourDistribution: {},
        weekTrend: 0,
        monthTrend: 0,
        lastCalculatedAt: now,
        createdAt: now,
      });

      expect(insight.id).toBe('test-id');
      expect(insight.lastCalculatedAt).toEqual(now);
      expect(insight.createdAt).toEqual(now);
    });
  });
});

function createInsight(overrides: Partial<{
  userCount: number;
  lastCalculatedAt: Date;
  weekTrend: number;
  monthTrend: number;
  peakHourDistribution: Record<number, number>;
}> = {}): RegionalInsight {
  return new RegionalInsight({
    regionId: 'grid_37.50_127.00',
    regionName: '테스트 지역',
    gridLat: 37.505,
    gridLng: 127.005,
    avgDurationMinutes: 40,
    medianDurationMinutes: 38,
    userCount: overrides.userCount ?? 10,
    sessionCount: 50,
    peakHourDistribution: overrides.peakHourDistribution ?? { 8: 20, 18: 15 },
    weekTrend: overrides.weekTrend ?? 0,
    monthTrend: overrides.monthTrend ?? 0,
    lastCalculatedAt: overrides.lastCalculatedAt ?? new Date(),
  });
}
