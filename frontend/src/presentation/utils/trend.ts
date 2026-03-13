type TrendLike = 'improving' | 'stable' | 'worsening';

/**
 * Returns a directional arrow symbol for a commute trend.
 * ↓ improving (commute time decreased), ↑ worsening (time increased), → stable.
 */
export function getTrendArrow(trend: TrendLike): string {
  if (trend === 'improving') return '\u2193'; // ↓
  if (trend === 'worsening') return '\u2191'; // ↑
  return '\u2192'; // →
}
