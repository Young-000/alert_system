import type { TrendDirection } from '@infrastructure/api/commute-api.client';

interface TrendIndicatorProps {
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;
}

function getTrendArrow(trend: TrendDirection): string {
  if (trend === 'improving') return '\u2193'; // ↓
  if (trend === 'worsening') return '\u2191'; // ↑
  return '\u2192'; // →
}

function getTrendClassName(trend: TrendDirection): string {
  if (trend === 'improving') return 'trend-indicator--improving';
  if (trend === 'worsening') return 'trend-indicator--worsening';
  return 'trend-indicator--stable';
}

function getTrendText(
  trend: TrendDirection,
  changeFromPrevious: number,
  changePercentage: number | null,
): string {
  const absChange = Math.abs(changeFromPrevious);
  const pctText = changePercentage !== null ? ` (${Math.abs(changePercentage)}%)` : '';

  if (trend === 'improving') {
    return `전주 대비 ${absChange}분 단축${pctText}`;
  }
  if (trend === 'worsening') {
    return `전주 대비 ${absChange}분 증가${pctText}`;
  }
  return '전주와 비슷';
}

export function TrendIndicator({
  changeFromPrevious,
  changePercentage,
  trend,
}: TrendIndicatorProps): JSX.Element | null {
  if (trend === null || changeFromPrevious === null) {
    return null;
  }

  const arrow = getTrendArrow(trend);
  const className = getTrendClassName(trend);
  const text = getTrendText(trend, changeFromPrevious, changePercentage);

  return (
    <span
      className={`trend-indicator ${className}`}
      aria-label={text}
    >
      <span className="trend-indicator-arrow" aria-hidden="true">{arrow}</span>
      <span className="trend-indicator-text">{text}</span>
    </span>
  );
}
