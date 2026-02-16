import type { RouteComparisonResponse } from '@infrastructure/api/commute-api.client';

interface DetailedRouteComparisonProps {
  routeComparison: RouteComparisonResponse;
}

export function DetailedRouteComparison({
  routeComparison,
}: DetailedRouteComparisonProps): JSX.Element {
  return (
    <section className="detailed-comparison-section">
      <h2>상세 경로 비교</h2>
      <div className="comparison-winners" role="group" aria-label="경로별 수상 카드">
        {routeComparison.winner.fastest && (
          <div className="winner-badge-card" aria-label={`가장 빠른: ${routeComparison.routes.find(r => r.routeId === routeComparison.winner.fastest)?.routeName || '-'}`}>
            <span className="winner-badge-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span>
            <div className="winner-badge-text">
              <span className="winner-badge-label">가장 빠른</span>
              <span className="winner-badge-name">
                {routeComparison.routes.find(r => r.routeId === routeComparison.winner.fastest)?.routeName || '-'}
              </span>
            </div>
          </div>
        )}
        {routeComparison.winner.mostReliable && (
          <div className="winner-badge-card" aria-label={`가장 안정적: ${routeComparison.routes.find(r => r.routeId === routeComparison.winner.mostReliable)?.routeName || '-'}`}>
            <span className="winner-badge-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div className="winner-badge-text">
              <span className="winner-badge-label">가장 안정적</span>
              <span className="winner-badge-name">
                {routeComparison.routes.find(r => r.routeId === routeComparison.winner.mostReliable)?.routeName || '-'}
              </span>
            </div>
          </div>
        )}
        {routeComparison.winner.recommended && (
          <div className="winner-badge-card recommended" aria-label={`추천: ${routeComparison.routes.find(r => r.routeId === routeComparison.winner.recommended)?.routeName || '-'}`}>
            <span className="winner-badge-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </span>
            <div className="winner-badge-text">
              <span className="winner-badge-label">추천</span>
              <span className="winner-badge-name">
                {routeComparison.routes.find(r => r.routeId === routeComparison.winner.recommended)?.routeName || '-'}
              </span>
            </div>
          </div>
        )}
      </div>
      {routeComparison.analysis.timeDifference > 0 && (
        <p className="comparison-insight">
          시간 차이 평균 <strong>{routeComparison.analysis.timeDifference}분</strong>
          {routeComparison.analysis.reliabilityDifference > 0 &&
            ` · 안정성 차이 ${routeComparison.analysis.reliabilityDifference}점`
          }
        </p>
      )}
    </section>
  );
}
