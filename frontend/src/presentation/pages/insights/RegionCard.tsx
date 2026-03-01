import type { RegionSummary, InsightTrendDirection } from '@infrastructure/api/commute-api.client';

interface RegionCardProps {
  region: RegionSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

function getTrendLabel(direction: InsightTrendDirection, value: number): string {
  const absVal = Math.abs(value).toFixed(1);
  if (direction === 'improving') return `${absVal}% 개선`;
  if (direction === 'worsening') return `${absVal}% 악화`;
  return '변동 없음';
}

function getTrendArrow(direction: InsightTrendDirection): string {
  if (direction === 'improving') return '\u2193'; // down arrow = commute time decreased = good
  if (direction === 'worsening') return '\u2191'; // up arrow = commute time increased = bad
  return '\u2192'; // right arrow = stable
}

function getConfidenceLabel(userCount: number): string {
  if (userCount >= 20) return '높음';
  if (userCount >= 10) return '보통';
  if (userCount >= 5) return '낮음';
  return '부족';
}

function getConfidenceClass(userCount: number): string {
  if (userCount >= 20) return 'insight-confidence--high';
  if (userCount >= 10) return 'insight-confidence--medium';
  return 'insight-confidence--low';
}

export function RegionCard({ region, isExpanded, onToggle }: RegionCardProps): JSX.Element {
  const trendClass =
    region.weekTrendDirection === 'improving'
      ? 'insight-trend--improving'
      : region.weekTrendDirection === 'worsening'
        ? 'insight-trend--worsening'
        : 'insight-trend--stable';

  return (
    <article className="insight-region-card" data-testid="region-card">
      <button
        type="button"
        className="insight-region-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`region-detail-${region.regionId}`}
      >
        <div className="insight-region-card-title">
          <h3 className="insight-region-name">{region.regionName}</h3>
          <span className={`insight-confidence ${getConfidenceClass(region.userCount)}`}>
            {getConfidenceLabel(region.userCount)}
          </span>
        </div>

        <div className="insight-region-card-stats">
          <div className="insight-stat">
            <span className="insight-stat-value">
              {Math.round(region.avgDurationMinutes)}분
            </span>
            <span className="insight-stat-label">평균 소요</span>
          </div>

          <div className="insight-stat">
            <span className="insight-stat-value">{region.userCount}명</span>
            <span className="insight-stat-label">통근자</span>
          </div>

          <div className="insight-stat">
            <span className="insight-stat-value">{region.sessionCount}회</span>
            <span className="insight-stat-label">기록</span>
          </div>
        </div>

        <div className="insight-region-card-trend">
          <span className={`insight-trend-badge ${trendClass}`}>
            <span className="insight-trend-arrow" aria-hidden="true">
              {getTrendArrow(region.weekTrendDirection)}
            </span>
            <span>전주 대비 {getTrendLabel(region.weekTrendDirection, region.weekTrend)}</span>
          </span>
          <span
            className={`insight-expand-icon ${isExpanded ? 'insight-expand-icon--open' : ''}`}
            aria-hidden="true"
          >
            &#9660;
          </span>
        </div>
      </button>

      {isExpanded && (
        <div
          id={`region-detail-${region.regionId}`}
          className="insight-region-card-detail"
          role="region"
          aria-label={`${region.regionName} 상세 정보`}
        >
          <div className="insight-detail-row">
            <span className="insight-detail-label">중간값</span>
            <span className="insight-detail-value">
              {Math.round(region.medianDurationMinutes)}분
            </span>
          </div>
          <div className="insight-detail-row">
            <span className="insight-detail-label">피크 시간</span>
            <span className="insight-detail-value">{region.peakHour}시</span>
          </div>
        </div>
      )}
    </article>
  );
}
