/**
 * Descriptive statistics utilities — pure functions, no side effects.
 * All operations are O(n) or O(n log n) at worst for small datasets (≤100).
 */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function weightedMean(
  values: readonly number[],
  weights: readonly number[],
): number {
  if (values.length === 0 || weights.length === 0) return 0;
  const len = Math.min(values.length, weights.length);

  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < len; i++) {
    weightedSum += values[i] * weights[i];
    weightSum += weights[i];
  }

  if (weightSum === 0) return 0;
  return weightedSum / weightSum;
}

export function variance(values: readonly number[], populationVariance = true): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const sumSquaredDiffs = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  const divisor = populationVariance ? values.length : values.length - 1;
  return sumSquaredDiffs / divisor;
}

export function stdDev(values: readonly number[], populationVariance = true): number {
  return Math.sqrt(variance(values, populationVariance));
}

/**
 * Calculate the p-th percentile using linear interpolation.
 * @param values - array of numbers (will be sorted internally)
 * @param p - percentile in [0, 100]
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const clampedP = Math.max(0, Math.min(100, p));

  const index = (clampedP / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

/**
 * Exponential decay weighted mean — most recent item (index 0) has highest weight.
 * weight_i = decayFactor ^ i
 */
export function exponentialWeightedMean(
  values: readonly number[],
  decayFactor = 0.9,
): number {
  if (values.length === 0) return 0;

  const weights = values.map((_, i) => decayFactor ** i);
  return weightedMean(values, weights);
}

/**
 * Clamp a value to [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert "HH:mm" time string to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to "HH:mm" time string.
 *
 * 반올림은 시·분으로 쪼개기 **전에** 한 번만 한다. 분 자리를 따로 반올림하면
 * 479.8분이 "07:60", 1439.7분이 "23:60"이 되어 시계에 없는 시각이 나온다.
 * 하루를 넘기는 보정도 반올림 뒤에 해야 1439.7분이 "00:00"이 된다.
 */
export function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
