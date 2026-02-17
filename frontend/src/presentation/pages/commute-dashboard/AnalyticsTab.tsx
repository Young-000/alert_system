import type { RouteAnalyticsResponse } from '@infrastructure/api/commute-api.client';
import { RouteAnalyticsCard } from './RouteAnalyticsCard';

interface AnalyticsTabProps {
  routeAnalytics: RouteAnalyticsResponse[];
  analyticsError?: string;
}

export function AnalyticsTab({ routeAnalytics, analyticsError }: AnalyticsTabProps): JSX.Element {
  return (
    <div className="tab-content" role="tabpanel" id="tabpanel-analytics" aria-labelledby="tab-analytics">
      {analyticsError && (
        <p className="muted" role="alert" style={{ margin: '0 0 0.75rem' }}>{analyticsError}</p>
      )}
      {/* Analytics Summary */}
      <section className="analytics-summary-section">
        <h2>경로 분석 점수</h2>
        <p className="section-subtitle">어떤 경로가 가장 좋을까요?</p>

        <div className="analytics-cards">
          {routeAnalytics.map((analytics) => (
            <RouteAnalyticsCard key={analytics.routeId} analytics={analytics} />
          ))}
        </div>
      </section>

      {/* Best Route Recommendation */}
      {routeAnalytics.filter(a => a.isRecommended).length > 0 && (
        <BestRouteRecommendation routeAnalytics={routeAnalytics} />
      )}

      {/* Route Comparison */}
      {routeAnalytics.length >= 2 && (
        <AnalyticsComparison routeAnalytics={routeAnalytics} />
      )}

      {/* Score Factors Explanation */}
      <ScoreFactorsExplanation />
    </div>
  );
}

function BestRouteRecommendation({
  routeAnalytics,
}: {
  routeAnalytics: RouteAnalyticsResponse[];
}): JSX.Element {
  const best = routeAnalytics.reduce((b, c) => c.score > b.score ? c : b);

  return (
    <section className="recommendation-section">
      <h2>추천 경로</h2>
      <div className="best-route-card">
        <div className="best-route-header">
          <span className={`route-badge ${best.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
            {best.routeName.includes('출근') ? '출' : '퇴'}
          </span>
          <span className="best-route-name">{best.routeName}</span>
          <span className={`grade-badge grade-${best.grade.toLowerCase()}`}>
            {best.grade}
          </span>
        </div>
        <div className="best-route-stats">
          <div className="best-stat">
            <span className="best-stat-value">{best.duration.average}분</span>
            <span className="best-stat-label">평균 시간</span>
          </div>
          <div className="best-stat">
            <span className="best-stat-value">{best.score}점</span>
            <span className="best-stat-label">종합 점수</span>
          </div>
          <div className="best-stat">
            <span className="best-stat-value">{best.totalTrips}회</span>
            <span className="best-stat-label">측정 횟수</span>
          </div>
        </div>
        <p className="best-route-summary">{best.summary}</p>
      </div>
    </section>
  );
}

function AnalyticsComparison({
  routeAnalytics,
}: {
  routeAnalytics: RouteAnalyticsResponse[];
}): JSX.Element {
  const maxScore = Math.max(...routeAnalytics.map(a => a.score || 1));

  return (
    <section className="comparison-section">
      <h2>경로 비교</h2>
      <div className="comparison-chart">
        {routeAnalytics.map((analytics) => {
          const barWidth = ((analytics.score || 0) / maxScore) * 100;

          return (
            <div key={analytics.routeId} className="comparison-row">
              <div className="comparison-info">
                <span className={`route-badge ${analytics.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
                  {analytics.routeName.includes('출근') ? '출' : '퇴'}
                </span>
                <span className="comparison-name">{analytics.routeName}</span>
                <span className={`grade-badge-small grade-${analytics.grade.toLowerCase()}`}>
                  {analytics.grade}
                </span>
              </div>
              <div className="comparison-bar-container">
                <div
                  className="comparison-bar"
                  style={{ width: `${barWidth}%` }}
                >
                  <span className="comparison-score">{analytics.score}점</span>
                </div>
              </div>
              <div className="comparison-detail">
                {analytics.duration.average}분 · {analytics.variabilityText}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScoreFactorsExplanation(): JSX.Element {
  return (
    <section className="score-factors-section">
      <details className="score-factors-accordion">
        <summary className="accordion-summary">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> 점수는 어떻게 계산되나요?</span>
          <span className="expand-icon">▼</span>
        </summary>
        <div className="accordion-content score-explanation">
          <div className="score-factor">
            <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
            <span className="factor-label">속도 (40%)</span>
            <span className="factor-desc">예상 시간 대비 실제 시간</span>
          </div>
          <div className="score-factor">
            <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
            <span className="factor-label">일관성 (40%)</span>
            <span className="factor-desc">매번 비슷한 시간이 걸리는지</span>
          </div>
          <div className="score-factor">
            <span className="factor-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
            <span className="factor-label">편의성 (20%)</span>
            <span className="factor-desc">환승 횟수, 대기 시간 비율</span>
          </div>
        </div>
      </details>
    </section>
  );
}
