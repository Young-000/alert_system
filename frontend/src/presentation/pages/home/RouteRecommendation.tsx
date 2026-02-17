import type { RouteRecommendationResponse } from '@infrastructure/api/commute-api.client';

interface RouteRecommendationProps {
  recommendation: RouteRecommendationResponse;
  onDismiss: () => void;
}

export function RouteRecommendation({ recommendation, onDismiss }: RouteRecommendationProps): JSX.Element {
  return (
    <section className="route-recommendation-banner" aria-label="경로 추천">
      <div className="route-rec-content">
        <span className="route-rec-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </span>
        <p className="route-rec-text">
          {recommendation.insights[0] || `"${recommendation.recommendation!.routeName}"이 현재 날씨에 가장 적합해요`}
        </p>
      </div>
      <button
        type="button"
        className="route-rec-dismiss"
        onClick={onDismiss}
        aria-label="추천 닫기"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </section>
  );
}
