/**
 * Bayesian Normal-Normal conjugate prior/posterior estimation.
 *
 * Model:
 *   Prior:      mu ~ N(mu_0, sigma_0^2)
 *   Likelihood: x_i ~ N(mu, sigma^2)
 *   Posterior:  mu | data ~ N(mu_n, sigma_n^2)
 *
 * Update rules:
 *   mu_n    = (mu_0 / sigma_0^2 + sum(x_i) / sigma^2) / (1/sigma_0^2 + n/sigma^2)
 *   sigma_n^2 = 1 / (1/sigma_0^2 + n/sigma^2)
 *
 * Confidence score: 1 - (sigma_n / sigma_0), clamped [0.3, 0.95]
 */

import { clamp } from './descriptive-stats';

export interface BayesianPrior {
  mu: number;       // prior mean (e.g., 480 = 08:00 in minutes)
  sigma: number;    // prior standard deviation (e.g., 15 minutes)
}

export interface BayesianPosterior {
  mu: number;       // posterior mean
  sigma: number;    // posterior standard deviation
  confidence: number; // data-driven confidence [0.3, 0.95]
  sampleCount: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;    // e.g., 0.95 for 95% CI
}

/**
 * Default prior: population average departure time.
 * mu = 480 (08:00), sigma = 15 minutes
 */
export const DEFAULT_PRIOR: BayesianPrior = {
  mu: 480,
  sigma: 15,
};

/**
 * Update the posterior given observed data points.
 *
 * @param prior - Prior distribution parameters
 * @param observations - Observed values (e.g., departure times in minutes)
 * @param likelihoodSigma - Known/estimated observation noise std dev.
 *                          If not provided, sample std dev is used (min 5).
 */
export function updatePosterior(
  prior: BayesianPrior,
  observations: readonly number[],
  likelihoodSigma?: number,
): BayesianPosterior {
  const n = observations.length;

  if (n === 0) {
    return {
      mu: prior.mu,
      sigma: prior.sigma,
      confidence: clamp(1 - 1, 0.3, 0.95), // = 0.3 (minimum)
      sampleCount: 0,
    };
  }

  // Estimate observation noise from sample std dev if not given
  const sigma = likelihoodSigma ?? Math.max(estimateSigma(observations), 5);

  const priorPrecision = 1 / (prior.sigma ** 2);
  const likelihoodPrecision = n / (sigma ** 2);
  const dataSum = observations.reduce((s, x) => s + x, 0);

  // Posterior precision = prior precision + likelihood precision
  const posteriorPrecision = priorPrecision + likelihoodPrecision;

  // Posterior mean
  const posteriorMu =
    (prior.mu * priorPrecision + dataSum * (1 / (sigma ** 2))) / posteriorPrecision;

  // Posterior variance & std dev
  const posteriorSigma = Math.sqrt(1 / posteriorPrecision);

  // Confidence: how much uncertainty was reduced
  const confidence = clamp(1 - posteriorSigma / prior.sigma, 0.3, 0.95);

  return {
    mu: posteriorMu,
    sigma: posteriorSigma,
    confidence,
    sampleCount: n,
  };
}

/**
 * Compute a credible interval (Bayesian confidence interval) from the posterior.
 *
 * Uses z-scores for the Normal distribution:
 *   90% -> z = 1.645
 *   95% -> z = 1.960
 *   99% -> z = 2.576
 */
export function credibleInterval(
  posterior: BayesianPosterior,
  level = 0.95,
): ConfidenceInterval {
  const zScores: Record<string, number> = {
    '0.9': 1.645,
    '0.95': 1.96,
    '0.99': 2.576,
  };

  const z = zScores[level.toString()] ?? 1.96;

  return {
    lower: posterior.mu - z * posterior.sigma,
    upper: posterior.mu + z * posterior.sigma,
    level,
  };
}

/**
 * Estimate sigma from sample data using sample standard deviation.
 * Returns at least 1 to avoid division by zero.
 */
function estimateSigma(values: readonly number[]): number {
  if (values.length < 2) return 15; // default when too few samples

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const sumSqDiff = values.reduce((s, v) => s + (v - avg) ** 2, 0);
  return Math.max(1, Math.sqrt(sumSqDiff / (values.length - 1)));
}
