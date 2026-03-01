import { CONGESTION_PRIOR } from './congestion-aggregation.service';
import { updatePosterior } from '@application/services/statistics/bayesian-estimator';
import { SegmentCongestion } from '@domain/entities/segment-congestion.entity';

/**
 * Unit tests for the congestion aggregation logic.
 * Tests the Bayesian smoothing and congestion level computation
 * without requiring a database connection.
 */
describe('CongestionAggregation - Bayesian Smoothing', () => {
  describe('CONGESTION_PRIOR', () => {
    it('prior mu는 3분이다', () => {
      expect(CONGESTION_PRIOR.mu).toBe(3);
    });

    it('prior sigma는 5이다 (wide uncertainty)', () => {
      expect(CONGESTION_PRIOR.sigma).toBe(5);
    });
  });

  describe('Cold start: 0-2 samples', () => {
    it('0개 관측 시 posterior는 prior에 가깝다', () => {
      const posterior = updatePosterior(CONGESTION_PRIOR, []);
      expect(posterior.mu).toBe(CONGESTION_PRIOR.mu);
      expect(posterior.sigma).toBe(CONGESTION_PRIOR.sigma);
      expect(posterior.confidence).toBeCloseTo(0.3, 1); // minimum
      expect(posterior.sampleCount).toBe(0);
    });

    it('1개 관측 시 posterior는 prior 쪽으로 당겨진다', () => {
      const posterior = updatePosterior(CONGESTION_PRIOR, [15]);
      // Raw mean = 15, but posterior should be pulled toward prior (3)
      expect(posterior.mu).toBeLessThan(15);
      expect(posterior.mu).toBeGreaterThan(CONGESTION_PRIOR.mu);
    });

    it('2개 극단적 관측 시 posterior는 prior 쪽으로 당겨진다', () => {
      const posterior = updatePosterior(CONGESTION_PRIOR, [15, 20]);
      // Raw mean = 17.5, but posterior should be closer to prior
      expect(posterior.mu).toBeLessThan(17.5);
      expect(posterior.mu).toBeGreaterThan(CONGESTION_PRIOR.mu);
    });

    it('2개 관측 시 confidence는 낮다 (< 0.5)', () => {
      const posterior = updatePosterior(CONGESTION_PRIOR, [5, 10]);
      expect(posterior.confidence).toBeLessThan(0.5);
    });

    it('cold start 상태에서 congestion level은 moderate 기본값이다', () => {
      // Prior mu=3 -> moderate (2-5 range)
      const posterior = updatePosterior(CONGESTION_PRIOR, []);
      const level = SegmentCongestion.determineCongestionLevel(posterior.mu);
      expect(level).toBe('moderate');
    });
  });

  describe('Convergence: 10+ samples', () => {
    it('10개 이상의 일관된 low 데이터에서 posterior는 데이터에 수렴한다', () => {
      const lowDelays = Array(15).fill(1); // 1분 delay consistently
      const posterior = updatePosterior(CONGESTION_PRIOR, lowDelays);
      expect(posterior.mu).toBeCloseTo(1, 0); // ~1분
      expect(posterior.confidence).toBeGreaterThan(0.5);

      const level = SegmentCongestion.determineCongestionLevel(posterior.mu);
      expect(level).toBe('low');
    });

    it('10개 이상의 일관된 high 데이터에서 posterior는 데이터에 수렴한다', () => {
      const highDelays = Array(15).fill(8); // 8분 delay consistently
      const posterior = updatePosterior(CONGESTION_PRIOR, highDelays);
      expect(posterior.mu).toBeCloseTo(8, 0); // ~8분
      expect(posterior.confidence).toBeGreaterThan(0.5);

      const level = SegmentCongestion.determineCongestionLevel(posterior.mu);
      expect(level).toBe('high');
    });

    it('20개 이상의 severe 데이터에서 posterior는 데이터에 수렴한다', () => {
      // Add small noise to avoid degenerate case where all values are identical
      const severeDelays = Array.from({ length: 20 }, (_, i) => 14 + (i % 3));
      const posterior = updatePosterior(CONGESTION_PRIOR, severeDelays);
      expect(posterior.mu).toBeGreaterThan(10);
      expect(posterior.confidence).toBeGreaterThan(0.5);

      const level = SegmentCongestion.determineCongestionLevel(posterior.mu);
      expect(level).toBe('severe');
    });

    it('데이터가 많을수록 confidence가 높아진다', () => {
      const data5 = Array(5).fill(5);
      const data20 = Array(20).fill(5);
      const data50 = Array(50).fill(5);

      const p5 = updatePosterior(CONGESTION_PRIOR, data5);
      const p20 = updatePosterior(CONGESTION_PRIOR, data20);
      const p50 = updatePosterior(CONGESTION_PRIOR, data50);

      expect(p20.confidence).toBeGreaterThan(p5.confidence);
      expect(p50.confidence).toBeGreaterThan(p20.confidence);
    });
  });

  describe('Mixed data', () => {
    it('혼합된 데이터에서 posterior는 적절한 중간값을 반환한다', () => {
      // Mix of low, moderate, and high delays
      const mixedDelays = [1, 2, 3, 5, 8, 2, 4, 6, 1, 3];
      const rawMean = mixedDelays.reduce((s, v) => s + v, 0) / mixedDelays.length;
      const posterior = updatePosterior(CONGESTION_PRIOR, mixedDelays);

      // Posterior should be close to raw mean with 10 samples
      expect(Math.abs(posterior.mu - rawMean)).toBeLessThan(1);
    });

    it('이상치가 있어도 Bayesian smoothing이 극단값을 완화한다', () => {
      // Mostly normal (3min) with one extreme outlier (30min)
      const withOutlier = [3, 3, 3, 3, 3, 3, 3, 3, 3, 30];
      const posterior = updatePosterior(CONGESTION_PRIOR, withOutlier);

      // Raw mean = 6.0, but posterior should be somewhat less due to prior
      expect(posterior.mu).toBeLessThan(6.5);
    });
  });

  describe('CongestionLevel thresholds', () => {
    // Thresholds use strict > comparison:
    // < 2 => low, > 2 => moderate, > 5 => high, > 10 => severe
    const cases: [number, string][] = [
      [0, 'low'],
      [1.9, 'low'],
      [2, 'low'],        // exactly 2 is NOT > 2, so still low
      [2.1, 'moderate'],
      [4.9, 'moderate'],
      [5, 'moderate'],   // exactly 5 is NOT > 5, so still moderate
      [5.1, 'high'],
      [9.9, 'high'],
      [10, 'high'],      // exactly 10 is NOT > 10, so still high
      [10.1, 'severe'],
      [20, 'severe'],
    ];

    cases.forEach(([delay, expected]) => {
      it(`지연 ${delay}분은 ${expected} 레벨이다`, () => {
        expect(SegmentCongestion.determineCongestionLevel(delay)).toBe(expected);
      });
    });
  });
});
