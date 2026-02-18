import { memo } from 'react';
import type { DeparturePrediction as DeparturePredictionData } from '@infrastructure/api';

interface DeparturePredictionProps {
  prediction: DeparturePredictionData;
}

export const DeparturePrediction = memo(function DeparturePrediction({ prediction }: DeparturePredictionProps): JSX.Element {
  return (
    <section className="departure-prediction" aria-label="추천 출발 시간">
      <div className="departure-prediction-content">
        <span className="departure-prediction-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <div className="departure-prediction-text">
          <span className="departure-prediction-time">추천 출발 {prediction.recommendedTime}</span>
          <span className="departure-prediction-reason">{prediction.explanation}</span>
        </div>
        <span className="departure-prediction-confidence">
          신뢰도 {Math.round(prediction.confidence * 100)}%
        </span>
      </div>
    </section>
  );
});
