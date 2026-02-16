import type {
  CommuteStatsResponse,
  RouteComparisonResponse,
} from '@infrastructure/api/commute-api.client';
import { CheckpointAnalysisBar } from './CheckpointAnalysisBar';
import { RouteComparisonChart } from './RouteComparisonChart';
import { DetailedRouteComparison } from './DetailedRouteComparison';

interface RoutesTabProps {
  stats: CommuteStatsResponse;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  routeComparison: RouteComparisonResponse | null;
}

export function RoutesTab({
  stats,
  selectedRouteId,
  onSelectRoute,
  routeComparison,
}: RoutesTabProps): JSX.Element {
  const selectedRouteStats = stats.routeStats.find((r) => r.routeId === selectedRouteId);

  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-routes" aria-labelledby="tab-routes">
      {/* Route Comparison Section */}
      {stats.routeStats.length > 1 && (
        <RouteComparisonChart
          routeStats={stats.routeStats}
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
        />
      )}

      {/* Route Selector */}
      <div className="route-selector">
        {stats.routeStats.map((route) => (
          <button
            key={route.routeId}
            type="button"
            className={`route-tab ${selectedRouteId === route.routeId ? 'active' : ''}`}
            onClick={() => onSelectRoute(route.routeId)}
          >
            {route.routeName}
          </button>
        ))}
      </div>

      {selectedRouteStats && (
        <>
          {/* Route Summary */}
          <section className="route-summary">
            <h2>{selectedRouteStats.routeName} 분석</h2>
            <div className="route-stats-grid">
              <div className="route-stat">
                <span className="route-stat-value">{selectedRouteStats.totalSessions}회</span>
                <span className="route-stat-label">총 이용</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-value">{selectedRouteStats.averageTotalDuration}분</span>
                <span className="route-stat-label">평균 시간</span>
              </div>
              <div className="route-stat highlight">
                <span className="route-stat-value">{selectedRouteStats.averageTotalWaitTime}분</span>
                <span className="route-stat-label">평균 대기</span>
              </div>
              <div className="route-stat">
                <span className="route-stat-value">{selectedRouteStats.waitTimePercentage}%</span>
                <span className="route-stat-label">대기 비율</span>
              </div>
            </div>
          </section>

          {/* Checkpoint Analysis */}
          <section className="checkpoint-analysis">
            <h2>구간별 분석</h2>
            <p className="section-subtitle">
              어느 구간에서 시간이 많이 걸리나요?
            </p>

            <div className="checkpoint-bars">
              {selectedRouteStats.checkpointStats.map((cp) => (
                <CheckpointAnalysisBar key={cp.checkpointId} checkpoint={cp} />
              ))}
            </div>

            {/* Bottleneck highlight */}
            {selectedRouteStats.bottleneckCheckpoint && (
              <div className="bottleneck-notice">
                <span className="bottleneck-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                <span>
                  <strong>{selectedRouteStats.bottleneckCheckpoint}</strong> 구간이 가장 지연이 많아요
                </span>
              </div>
            )}

            {/* Variable checkpoint */}
            {selectedRouteStats.mostVariableCheckpoint && (
              <div className="variable-notice">
                <span className="variable-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
                <span>
                  <strong>{selectedRouteStats.mostVariableCheckpoint}</strong> 구간은 시간이 들쑥날쑥해요
                </span>
              </div>
            )}
          </section>
        </>
      )}

      {/* A-4: Detailed Route Comparison */}
      {routeComparison && routeComparison.routes.length >= 2 && (
        <DetailedRouteComparison routeComparison={routeComparison} />
      )}
    </div>
  );
}
