import {
  updatePosterior,
  credibleInterval,
  DEFAULT_PRIOR,
  BayesianPrior,
} from './bayesian-estimator';

describe('bayesian-estimator', () => {
  describe('updatePosterior', () => {
    it('관측 데이터가 없으면 사전 분포를 그대로 반환한다', () => {
      const posterior = updatePosterior(DEFAULT_PRIOR, []);

      expect(posterior.mu).toBe(DEFAULT_PRIOR.mu);
      expect(posterior.sigma).toBe(DEFAULT_PRIOR.sigma);
      expect(posterior.confidence).toBe(0.3); // minimum
      expect(posterior.sampleCount).toBe(0);
    });

    it('데이터가 많을수록 사후 평균이 데이터 평균에 가까워진다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 }; // 08:00

      // 데이터: 모두 492분 (08:12) 근처
      const observations = Array(20).fill(0).map(() => 492 + (Math.random() - 0.5) * 2);
      const posterior = updatePosterior(prior, observations);

      // 사후 평균은 데이터 평균(~492)에 훨씬 가까워야 함
      expect(posterior.mu).toBeGreaterThan(488);
      expect(posterior.mu).toBeLessThan(496);
    });

    it('데이터가 1개이면 사전분포와 데이터 사이의 값이다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };
      const posterior = updatePosterior(prior, [500], 10);

      // 사후 평균은 480과 500 사이
      expect(posterior.mu).toBeGreaterThan(480);
      expect(posterior.mu).toBeLessThan(500);
    });

    it('데이터가 많을수록 신뢰도가 높아진다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };

      const posterior5 = updatePosterior(prior, Array(5).fill(490), 10);
      const posterior20 = updatePosterior(prior, Array(20).fill(490), 10);
      const posterior50 = updatePosterior(prior, Array(50).fill(490), 10);

      expect(posterior5.confidence).toBeLessThan(posterior20.confidence);
      expect(posterior20.confidence).toBeLessThan(posterior50.confidence);
    });

    it('신뢰도는 [0.3, 0.95] 범위로 클램프된다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };

      // 매우 적은 데이터 → 최소 0.3
      const lowConf = updatePosterior(prior, [490], 100);
      expect(lowConf.confidence).toBeGreaterThanOrEqual(0.3);

      // 매우 많은 데이터 → 최대 0.95
      const highConf = updatePosterior(prior, Array(1000).fill(490), 5);
      expect(highConf.confidence).toBeLessThanOrEqual(0.95);
    });

    it('사후 분산은 사전 분산보다 항상 작다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };
      const posterior = updatePosterior(prior, [485, 490, 495], 10);

      expect(posterior.sigma).toBeLessThan(prior.sigma);
    });

    it('likelihoodSigma를 지정하면 그 값을 사용한다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };

      // 큰 sigma → 사전분포에 더 가까움
      const largeSigma = updatePosterior(prior, [500], 100);
      // 작은 sigma → 데이터에 더 가까움
      const smallSigma = updatePosterior(prior, [500], 1);

      expect(largeSigma.mu).toBeLessThan(smallSigma.mu);
      expect(largeSigma.mu).toBeCloseTo(480, 0); // prior에 가까움
      expect(smallSigma.mu).toBeCloseTo(500, 0); // data에 가까움
    });

    it('likelihoodSigma 미제공 시 샘플 표준편차를 추정한다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };
      const observations = [480, 485, 490, 495, 500];

      const posterior = updatePosterior(prior, observations);

      expect(posterior.mu).toBeDefined();
      expect(posterior.sigma).toBeDefined();
      expect(posterior.confidence).toBeGreaterThanOrEqual(0.3);
    });

    it('모든 관측값이 동일해도 안정적으로 동작한다', () => {
      const prior: BayesianPrior = { mu: 480, sigma: 15 };
      const observations = [492, 492, 492, 492, 492];

      const posterior = updatePosterior(prior, observations);

      expect(posterior.mu).toBeGreaterThan(488);
      expect(posterior.mu).toBeLessThan(495);
      expect(posterior.confidence).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('credibleInterval', () => {
    it('95% 신뢰구간을 계산한다', () => {
      const posterior = { mu: 490, sigma: 5, confidence: 0.7, sampleCount: 10 };
      const ci = credibleInterval(posterior, 0.95);

      expect(ci.lower).toBeCloseTo(490 - 1.96 * 5, 1);
      expect(ci.upper).toBeCloseTo(490 + 1.96 * 5, 1);
      expect(ci.level).toBe(0.95);
    });

    it('90% 신뢰구간을 계산한다', () => {
      const posterior = { mu: 490, sigma: 5, confidence: 0.7, sampleCount: 10 };
      const ci = credibleInterval(posterior, 0.9);

      expect(ci.lower).toBeCloseTo(490 - 1.645 * 5, 1);
      expect(ci.upper).toBeCloseTo(490 + 1.645 * 5, 1);
    });

    it('sigma가 작을수록 구간이 좁다', () => {
      const narrow = credibleInterval(
        { mu: 490, sigma: 2, confidence: 0.9, sampleCount: 50 },
      );
      const wide = credibleInterval(
        { mu: 490, sigma: 10, confidence: 0.5, sampleCount: 5 },
      );

      expect(narrow.upper - narrow.lower).toBeLessThan(wide.upper - wide.lower);
    });

    it('기본 레벨은 95%이다', () => {
      const posterior = { mu: 490, sigma: 5, confidence: 0.7, sampleCount: 10 };
      const ci = credibleInterval(posterior);

      expect(ci.level).toBe(0.95);
    });
  });

  describe('DEFAULT_PRIOR', () => {
    it('기본 사전분포는 08:00 (480분)이다', () => {
      expect(DEFAULT_PRIOR.mu).toBe(480);
    });

    it('기본 불확실성은 15분이다', () => {
      expect(DEFAULT_PRIOR.sigma).toBe(15);
    });
  });
});
