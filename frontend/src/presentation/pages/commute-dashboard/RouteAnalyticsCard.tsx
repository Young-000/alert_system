import type { RouteAnalyticsResponse } from '@infrastructure/api/commute-api.client';

interface RouteAnalyticsCardProps {
  analytics: RouteAnalyticsResponse;
}

const gradeColors: Record<string, string> = {
  S: '#FFD700',
  A: '#4CAF50',
  B: '#2196F3',
  C: '#FF9800',
  D: '#F44336',
};

export function RouteAnalyticsCard({ analytics }: RouteAnalyticsCardProps): JSX.Element {
  return (
    <div className={`analytics-card ${analytics.isRecommended ? 'recommended' : ''}`}>
      <div className="analytics-card-header">
        <span className={`route-badge ${analytics.routeName.includes('출근') ? 'morning' : 'evening'}`} aria-hidden="true">
          {analytics.routeName.includes('출근') ? '출' : '퇴'}
        </span>
        <div className="analytics-title-area">
          <h3 className="analytics-route-name">{analytics.routeName}</h3>
          <span className="analytics-trips">{analytics.totalTrips}회 측정</span>
        </div>
        <div
          className={`analytics-grade grade-${analytics.grade.toLowerCase()}`}
          style={{ backgroundColor: gradeColors[analytics.grade] || '#888' }}
        >
          {analytics.grade}
        </div>
      </div>

      <div className="analytics-card-body">
        <div className="analytics-score-ring">
          <svg viewBox="0 0 36 36" className="score-circle">
            <path
              className="score-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="score-fill"
              strokeDasharray={`${analytics.score}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="score-value">{analytics.score}</span>
        </div>

        <div className="analytics-details">
          <div className="analytics-detail-row">
            <span className="detail-label">평균</span>
            <span className="detail-value">{analytics.duration.average}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">범위</span>
            <span className="detail-value">{analytics.duration.min}-{analytics.duration.max}분</span>
          </div>
          <div className="analytics-detail-row">
            <span className="detail-label">편차</span>
            <span className="detail-value">±{analytics.duration.stdDev}분</span>
          </div>
        </div>
      </div>

      <div className="analytics-card-footer">
        <div className="score-factors">
          <div className="factor-bar">
            <span className="factor-label">속도</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.speed}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.speed}</span>
          </div>
          <div className="factor-bar">
            <span className="factor-label">일관성</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.reliability}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.reliability}</span>
          </div>
          <div className="factor-bar">
            <span className="factor-label">편의</span>
            <div className="factor-track">
              <div className="factor-fill" style={{ width: `${analytics.scoreFactors.comfort}%` }} />
            </div>
            <span className="factor-value">{analytics.scoreFactors.comfort}</span>
          </div>
        </div>
        <p className="analytics-variability">{analytics.variabilityText}</p>
      </div>

      {analytics.isRecommended && (
        <div className="recommended-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          추천
        </div>
      )}
    </div>
  );
}
