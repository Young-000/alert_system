import type { RouteStats } from '@infrastructure/api/commute-api.client';

interface RouteComparisonChartProps {
  routeStats: RouteStats[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

export function RouteComparisonChart({
  routeStats,
  selectedRouteId,
  onSelectRoute,
}: RouteComparisonChartProps): JSX.Element {
  const fastest = routeStats.reduce((min, route) =>
    (route.averageTotalDuration || 999) < (min.averageTotalDuration || 999) ? route : min
  );

  return (
    <section className="route-comparison-section">
      <h2>경로별 비교</h2>
      <p className="section-subtitle">어떤 경로가 더 빠를까요?</p>

      <div className="route-comparison-chart">
        {routeStats.map((route) => {
          const maxDuration = Math.max(...routeStats.map(r => r.averageTotalDuration || 1));
          const barWidth = ((route.averageTotalDuration || 0) / maxDuration) * 100;

          return (
            <div
              key={route.routeId}
              className={`route-comparison-row ${selectedRouteId === route.routeId ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectRoute(route.routeId)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectRoute(route.routeId); } }}
            >
              <div className="route-comparison-info">
                <span className={`route-badge ${route.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
                  {route.routeName.includes('출근') ? '출' : '퇴'}
                </span>
                <span className="route-comparison-name">{route.routeName}</span>
                <span className="route-comparison-count">({route.totalSessions}회)</span>
              </div>
              <div className="route-comparison-bar-container">
                <div
                  className="route-comparison-bar"
                  style={{ width: `${barWidth}%` }}
                  role="img"
                  aria-label={`${route.routeName}: 평균 ${route.averageTotalDuration}분`}
                >
                  <span className="route-comparison-value">{route.averageTotalDuration}분</span>
                </div>
                {route.averageTotalWaitTime > 0 && (
                  <span className="route-comparison-wait">
                    (대기 {route.averageTotalWaitTime}분)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Best route highlight */}
      {fastest.totalSessions > 0 && (
        <div className="best-route-notice">
          <span className="best-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span>
          <span><strong>{fastest.routeName}</strong>이 평균 {fastest.averageTotalDuration}분으로 가장 빨라요</span>
        </div>
      )}
    </section>
  );
}
