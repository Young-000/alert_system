import { Link } from 'react-router-dom';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';

interface StatsSectionProps {
  commuteStats: CommuteStatsResponse | null;
  routes: RouteResponse[];
  activeRouteId: string | undefined;
  onNavigateToRoutes: () => void;
}

export function StatsSection({
  commuteStats,
  routes,
  activeRouteId,
  onNavigateToRoutes,
}: StatsSectionProps): JSX.Element {
  const hasStats = commuteStats &&
    (commuteStats.overallAverageDuration > 0 ||
      (commuteStats.recentSessions != null && commuteStats.recentSessions > 0));

  return (
    <>
      <section className="home-stats" aria-label="이번 주 통근">
        <h3 className="home-stats-title">이번 주</h3>
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
      </section>

      {/* Other routes */}
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
