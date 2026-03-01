import type { CongestionLevel } from '@infrastructure/api/commute-api.client';

interface CongestionChipProps {
  readonly level: CongestionLevel;
  readonly avgWaitMinutes?: number;
  readonly sampleCount?: number;
  readonly size?: 'sm' | 'md';
}

const LEVEL_LABELS: Record<CongestionLevel, string> = {
  low: '원활',
  moderate: '보통',
  high: '혼잡',
  severe: '매우혼잡',
};

const LEVEL_ARIA: Record<CongestionLevel, string> = {
  low: '혼잡도 원활',
  moderate: '혼잡도 보통',
  high: '혼잡도 혼잡',
  severe: '혼잡도 매우혼잡',
};

const MIN_SAMPLE_COUNT = 3;

export function CongestionChip({
  level,
  avgWaitMinutes,
  sampleCount,
  size = 'sm',
}: CongestionChipProps): JSX.Element {
  const isCollecting = sampleCount !== undefined && sampleCount < MIN_SAMPLE_COUNT;

  if (isCollecting) {
    return (
      <span
        className={`congestion-chip congestion-chip--${size} congestion-chip--collecting`}
        aria-label="혼잡도 데이터 수집 중"
        data-testid="congestion-chip"
      >
        <span className="congestion-dot" aria-hidden="true" />
        <span>수집 중</span>
      </span>
    );
  }

  const label = LEVEL_LABELS[level];
  const ariaLabel = avgWaitMinutes !== undefined
    ? `${LEVEL_ARIA[level]}, 평균 대기 ${avgWaitMinutes.toFixed(0)}분`
    : LEVEL_ARIA[level];

  return (
    <span
      className={`congestion-chip congestion-chip--${size} congestion-chip--${level}`}
      aria-label={ariaLabel}
      data-testid="congestion-chip"
    >
      <span className="congestion-dot" aria-hidden="true" />
      <span>{label}</span>
      {size === 'md' && avgWaitMinutes !== undefined && (
        <span className="congestion-chip-detail">
          {avgWaitMinutes.toFixed(0)}분
          {sampleCount !== undefined && (
            <> ({sampleCount}건)</>
          )}
        </span>
      )}
    </span>
  );
}
