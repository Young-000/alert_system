import { useRegionDetail, useRegionPeakHours } from '@infrastructure/query/use-insights-query';
import { PeakHoursChart } from './PeakHoursChart';
import type { InsightTrendDirection } from '@infrastructure/api/commute-api.client';

interface RegionDetailPanelProps {
  regionId: string;
}

function getTrendBadge(
  label: string,
  direction: InsightTrendDirection,
  value: number,
): JSX.Element {
  const absVal = Math.abs(value).toFixed(1);
  const trendClass =
    direction === 'improving'
      ? 'insight-trend--improving'
      : direction === 'worsening'
        ? 'insight-trend--worsening'
        : 'insight-trend--stable';

  const arrow =
    direction === 'improving' ? '\u2193' : direction === 'worsening' ? '\u2191' : '\u2192';

  const text =
    direction === 'improving'
      ? `${absVal}% 개선`
      : direction === 'worsening'
        ? `${absVal}% 악화`
        : '변동 없음';

  return (
    <div className="insight-trend-row">
      <span className="insight-trend-row-label">{label}</span>
      <span className={`insight-trend-badge ${trendClass}`}>
        <span aria-hidden="true">{arrow}</span> {text}
      </span>
    </div>
  );
}

export function RegionDetailPanel({ regionId }: RegionDetailPanelProps): JSX.Element {
  const { data: detail, isLoading: detailLoading } = useRegionDetail(regionId);
  const { data: peakHours, isLoading: peakLoading } = useRegionPeakHours(regionId);

  if (detailLoading || peakLoading) {
    return (
      <div className="insight-detail-panel" data-testid="region-detail-loading">
        <div className="skeleton insight-skeleton-bar" />
        <div className="skeleton insight-skeleton-chart" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="insight-detail-panel">
        <p className="muted">상세 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="insight-detail-panel" data-testid="region-detail-panel">
      <div className="insight-detail-stats">
        <div className="insight-detail-row">
          <span className="insight-detail-label">평균 소요</span>
          <span className="insight-detail-value">
            {Math.round(detail.avgDurationMinutes)}분
          </span>
        </div>
        <div className="insight-detail-row">
          <span className="insight-detail-label">중간값</span>
          <span className="insight-detail-value">
            {Math.round(detail.medianDurationMinutes)}분
          </span>
        </div>
        <div className="insight-detail-row">
          <span className="insight-detail-label">통근자</span>
          <span className="insight-detail-value">{detail.userCount}명</span>
        </div>
        <div className="insight-detail-row">
          <span className="insight-detail-label">총 기록</span>
          <span className="insight-detail-value">{detail.sessionCount}회</span>
        </div>
      </div>

      <div className="insight-detail-trends">
        {getTrendBadge('전주 대비', detail.weekTrendDirection, detail.weekTrend)}
        {getTrendBadge('전월 대비', detail.monthTrendDirection, detail.monthTrend)}
      </div>

      {peakHours && (
        <PeakHoursChart
          distribution={peakHours.peakHourDistribution}
          peakHour={peakHours.peakHour}
          totalSessions={peakHours.totalSessions}
        />
      )}
    </div>
  );
}
