import { Link } from 'react-router-dom';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import { useCollapsible } from '@presentation/hooks/useCollapsible';

interface StatsSectionProps {
  commuteStats: CommuteStatsResponse | null;
  routes: RouteResponse[];
  activeRouteId: string | undefined;
  onNavigateToRoutes: () => void;
}

function ChevronIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return (
    <svg
      className={`collapsible-chevron ${expanded ? 'collapsible-chevron--expanded' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function buildSummaryText(
  commuteStats: CommuteStatsResponse | null,
  hasStats: boolean,
): string {
  if (!hasStats) return '이번 주 출퇴근 기록 없음';

  const parts: string[] = [];
  if (commuteStats?.overallAverageDuration) {
    parts.push(`평균 ${commuteStats.overallAverageDuration}분`);
  }
  if (commuteStats?.recentSessions != null && commuteStats.recentSessions > 0) {
    parts.push(`${commuteStats.recentSessions}회`);
  }

  return parts.length > 0 ? parts.join(' | ') : '이번 주 출퇴근 기록 없음';
}

export function StatsSection({
  commuteStats,
  routes,
  activeRouteId,
  onNavigateToRoutes,
}: StatsSectionProps): JSX.Element {
  const hasStats = commuteStats != null &&
    (commuteStats.overallAverageDuration > 0 ||
      (commuteStats.recentSessions != null && commuteStats.recentSessions > 0));

  const { isExpanded, ariaProps } = useCollapsible({
    storageKey: 'stats',
    defaultExpanded: false,
  });

  const summaryText = buildSummaryText(commuteStats, hasStats);
  const summaryLabel = isExpanded ? '통계 상세 접기' : '통계 상세 펼치기';

  return (
    <>
      <section
        className={`home-stats ${!isExpanded ? 'home-stats--collapsed' : ''}`}
        aria-label="이번 주 통근"
      >
        {/* Summary row (always visible, clickable to toggle) */}
        <div
          className="home-stats-summary-row"
          {...ariaProps}
          aria-label={summaryLabel}
          aria-controls="stats-detail-content"
        >
          <h3 className="home-stats-title home-stats-title--inline">이번 주</h3>
          <span className="home-stats-summary-text">{summaryText}</span>
          <ChevronIcon expanded={isExpanded} />
        </div>

        {/* Detail content (only visible when expanded) */}
        <div id="stats-detail-content" className={`collapsible-content ${isExpanded ? 'collapsible-content--expanded' : ''}`}>
          <div className="home-stats-detail">
            {hasStats ? (
              <>
                <div className="home-stats-row">
                  <div className="home-stat">
                    <span className="home-stat-value">
                      {commuteStats.overallAverageDuration ? `${commuteStats.overallAverageDuration}분` : '-'}
                    </span>
                    <span className="home-stat-label">평균</span>
                  </div>
                  <div className="home-stat">
                    <span className="home-stat-value">
                      {commuteStats.recentSessions != null ? `${commuteStats.recentSessions}회` : '-'}
                    </span>
                    <span className="home-stat-label">출퇴근</span>
                  </div>
                </div>
                {commuteStats.insights && commuteStats.insights.length > 0 && (
                  <p className="home-insight">{commuteStats.insights[0]}</p>
                )}
                <Link to="/commute/dashboard" className="home-stats-link">자세히 보기</Link>
              </>
            ) : (
              <div className="home-stats-empty">
                <p>출퇴근 기록을 시작하면 통계를 볼 수 있어요</p>
                <Link to="/commute/dashboard" className="home-stats-link">대시보드 보기</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Other routes - always visible regardless of collapse state */}
      {routes.length > 1 && (
        <section className="other-routes" aria-label="다른 경로 보기">
          {routes.filter(r => r.id !== activeRouteId).slice(0, 2).map(route => (
            <button
              key={route.id}
              type="button"
              className="other-route-chip"
              onClick={onNavigateToRoutes}
            >
              <span className="other-route-type">
                {route.routeType === 'morning' ? '출근' : '퇴근'}
              </span>
              <span>{route.name} 보기</span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
