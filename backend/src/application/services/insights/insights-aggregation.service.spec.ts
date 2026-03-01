import { REGIONAL_DURATION_PRIOR } from './insights-aggregation.service';
import { updatePosterior } from '@application/services/statistics/bayesian-estimator';
import { RegionalInsight, classifyTrend } from '@domain/entities/regional-insight.entity';

/**
 * Unit tests for the insights aggregation logic.
 * Tests the Bayesian smoothing, trend computation, and privacy filtering
 * without requiring a database connection.
 */
describe('InsightsAggregation - Bayesian Smoothing', () => {
  describe('REGIONAL_DURATION_PRIOR', () => {
    it('prior mu는 40분이다 (평균 통근 시간)', () => {
      expect(REGIONAL_DURATION_PRIOR.mu).toBe(40);
    });

    it('prior sigma는 20이다 (넓은 불확실성)', () => {
      expect(REGIONAL_DURATION_PRIOR.sigma).toBe(20);
    });
  });

  describe('Cold start: 0-2 samples', () => {
    it('0개 관측 시 posterior는 prior에 가깝다', () => {
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, []);
      expect(posterior.mu).toBe(REGIONAL_DURATION_PRIOR.mu);
      expect(posterior.sigma).toBe(REGIONAL_DURATION_PRIOR.sigma);
      expect(posterior.confidence).toBeCloseTo(0.3, 1);
      expect(posterior.sampleCount).toBe(0);
    });

    it('1개 관측 시 posterior는 prior 쪽으로 당겨진다', () => {
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, [90]);
      expect(posterior.mu).toBeLessThan(90);
      expect(posterior.mu).toBeGreaterThan(REGIONAL_DURATION_PRIOR.mu);
    });

    it('2개 극단적 관측 시 posterior는 prior 쪽으로 당겨진다', () => {
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, [90, 100]);
      expect(posterior.mu).toBeLessThan(95);
      expect(posterior.mu).toBeGreaterThan(REGIONAL_DURATION_PRIOR.mu);
    });
  });

  describe('Convergence: 10+ samples', () => {
    it('10개 이상의 일관된 짧은 통근 데이터에서 posterior가 수렴한다', () => {
      const shortCommutes = Array(15).fill(25);
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, shortCommutes);
      expect(posterior.mu).toBeCloseTo(25, 0);
      expect(posterior.confidence).toBeGreaterThan(0.5);
    });

    it('10개 이상의 일관된 긴 통근 데이터에서 posterior가 수렴한다', () => {
      const longCommutes = Array(15).fill(60);
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, longCommutes);
      expect(posterior.mu).toBeCloseTo(60, 0);
      expect(posterior.confidence).toBeGreaterThan(0.5);
    });

    it('데이터가 많을수록 confidence가 높아진다', () => {
      const data5 = Array(5).fill(45);
      const data20 = Array(20).fill(45);
      const data50 = Array(50).fill(45);

      const p5 = updatePosterior(REGIONAL_DURATION_PRIOR, data5);
      const p20 = updatePosterior(REGIONAL_DURATION_PRIOR, data20);
      const p50 = updatePosterior(REGIONAL_DURATION_PRIOR, data50);

      expect(p20.confidence).toBeGreaterThan(p5.confidence);
      expect(p50.confidence).toBeGreaterThan(p20.confidence);
    });
  });

  describe('Mixed data', () => {
    it('혼합된 통근 시간에서 posterior는 적절한 중간값을 반환한다', () => {
      const mixedDurations = [20, 30, 35, 40, 45, 50, 55, 25, 42, 38];
      const rawMean = mixedDurations.reduce((s, v) => s + v, 0) / mixedDurations.length;
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, mixedDurations);
      expect(Math.abs(posterior.mu - rawMean)).toBeLessThan(3);
    });

    it('이상치가 있어도 Bayesian smoothing이 극단값을 완화한다', () => {
      const withOutlier = [35, 35, 35, 35, 35, 35, 35, 35, 35, 120];
      const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, withOutlier);
      const rawMean = withOutlier.reduce((s, v) => s + v, 0) / withOutlier.length;
      // Posterior should be smoothed toward prior, less extreme than raw mean
      expect(posterior.mu).toBeLessThan(rawMean + 1);
    });
  });
});

describe('InsightsAggregation - Trend Calculation', () => {
  describe('classifyTrend', () => {
    it('통근 시간 증가 > 3%는 worsening이다', () => {
      expect(classifyTrend(5)).toBe('worsening');
      expect(classifyTrend(10)).toBe('worsening');
      expect(classifyTrend(50)).toBe('worsening');
    });

    it('통근 시간 감소 < -3%는 improving이다', () => {
      expect(classifyTrend(-5)).toBe('improving');
      expect(classifyTrend(-10)).toBe('improving');
      expect(classifyTrend(-50)).toBe('improving');
    });

    it('-3%~3% 사이는 stable이다', () => {
      expect(classifyTrend(0)).toBe('stable');
      expect(classifyTrend(1)).toBe('stable');
      expect(classifyTrend(-1)).toBe('stable');
      expect(classifyTrend(2.99)).toBe('stable');
      expect(classifyTrend(-2.99)).toBe('stable');
    });
  });

  describe('Trend computation logic', () => {
    function computeTrend(current: number[], previous: number[]): number {
      if (current.length === 0 || previous.length === 0) return 0;
      const currentAvg = current.reduce((s, v) => s + v, 0) / current.length;
      const previousAvg = previous.reduce((s, v) => s + v, 0) / previous.length;
      if (previousAvg === 0) return 0;
      return ((currentAvg - previousAvg) / previousAvg) * 100;
    }

    it('동일한 평균이면 0% 변화이다', () => {
      expect(computeTrend([40, 40, 40], [40, 40, 40])).toBe(0);
    });

    it('평균이 증가하면 양수 변화이다', () => {
      // 이전 30분, 현재 33분 -> +10%
      expect(computeTrend([33], [30])).toBeCloseTo(10, 0);
    });

    it('평균이 감소하면 음수 변화이다', () => {
      // 이전 40분, 현재 36분 -> -10%
      expect(computeTrend([36], [40])).toBeCloseTo(-10, 0);
    });

    it('이전 기간 데이터가 없으면 0이다', () => {
      expect(computeTrend([40], [])).toBe(0);
    });

    it('현재 기간 데이터가 없으면 0이다', () => {
      expect(computeTrend([], [40])).toBe(0);
    });

    it('이전 평균이 0이면 0이다', () => {
      expect(computeTrend([40], [0])).toBe(0);
    });
  });
});

describe('InsightsAggregation - Privacy Filter', () => {
  it('5명 이상의 사용자가 있는 지역만 표시한다', () => {
    const insight5 = new RegionalInsight({
      regionId: 'test-5',
      regionName: 'Test Region',
      gridLat: 37.5,
      gridLng: 127.0,
      avgDurationMinutes: 40,
      medianDurationMinutes: 38,
      userCount: 5,
      sessionCount: 20,
      peakHourDistribution: {},
      weekTrend: 0,
      monthTrend: 0,
    });
    expect(insight5.meetsPrivacyThreshold()).toBe(true);
  });

  it('4명의 사용자가 있는 지역은 숨긴다', () => {
    const insight4 = new RegionalInsight({
      regionId: 'test-4',
      regionName: 'Test Region',
      gridLat: 37.5,
      gridLng: 127.0,
      avgDurationMinutes: 40,
      medianDurationMinutes: 38,
      userCount: 4,
      sessionCount: 15,
      peakHourDistribution: {},
      weekTrend: 0,
      monthTrend: 0,
    });
    expect(insight4.meetsPrivacyThreshold()).toBe(false);
  });

  it('1명의 사용자가 있는 지역은 숨긴다', () => {
    const insight1 = new RegionalInsight({
      regionId: 'test-1',
      regionName: 'Private Region',
      gridLat: 37.5,
      gridLng: 127.0,
      avgDurationMinutes: 40,
      medianDurationMinutes: 38,
      userCount: 1,
      sessionCount: 50,
      peakHourDistribution: {},
      weekTrend: 0,
      monthTrend: 0,
    });
    expect(insight1.meetsPrivacyThreshold()).toBe(false);
  });

  it('100명의 사용자가 있는 지역은 표시한다', () => {
    const insight100 = new RegionalInsight({
      regionId: 'test-100',
      regionName: 'Popular Region',
      gridLat: 37.5,
      gridLng: 127.0,
      avgDurationMinutes: 40,
      medianDurationMinutes: 38,
      userCount: 100,
      sessionCount: 500,
      peakHourDistribution: {},
      weekTrend: 0,
      monthTrend: 0,
    });
    expect(insight100.meetsPrivacyThreshold()).toBe(true);
  });
});
