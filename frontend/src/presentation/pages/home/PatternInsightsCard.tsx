import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { usePredictionQuery } from '@infrastructure/query';
import type { PredictionResponse, PredictionTier } from '@infrastructure/api';

function isColdStart(tier: PredictionTier): boolean {
  return tier === 'cold_start';
}

function isLearning(tier: PredictionTier): boolean {
  return tier === 'basic' || tier === 'day_aware';
}

function formatConfidencePercent(confidence: number): number {
  return Math.round(confidence * 100);
}

function ColdStartState({ dataStatus }: { dataStatus: PredictionResponse['dataStatus'] }): JSX.Element {
  const current = dataStatus.totalRecords;
  const target = dataStatus.nextTierAt;
  const progressPercent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div className="pattern-card pattern-card--cold">
      <div className="pattern-card-header">
        <span className="pattern-card-icon" aria-hidden="true">
          <PatternIconSvg />
        </span>
        <span className="pattern-card-title">출발 패턴 분석</span>
      </div>
      <p className="pattern-card-message">
        출퇴근 기록을 쌓아보세요!
      </p>
      <div className="pattern-card-progress-wrap">
        <div
          className="pattern-card-progress"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-label={`기록 진행률 ${current}/${target}`}
        >
          <div
            className="pattern-card-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="pattern-card-progress-label">{current}/{target} 기록</span>
      </div>
    </div>
  );
}

function LearningState({ prediction }: { prediction: PredictionResponse }): JSX.Element {
  const confidencePercent = formatConfidencePercent(prediction.confidence);
  const topFactor = prediction.contributingFactors[0];

  return (
    <Link to="/patterns" className="pattern-card pattern-card--learning" aria-label="패턴 분석 보기">
      <div className="pattern-card-header">
        <span className="pattern-card-icon" aria-hidden="true">
          <PatternIconSvg />
        </span>
        <span className="pattern-card-title">출발 패턴 분석</span>
        <span className="pattern-card-arrow" aria-hidden="true">&rsaquo;</span>
      </div>
      <div className="pattern-card-body">
        <div className="pattern-card-time-row">
          <span className="pattern-card-label">평균 출발</span>
          <span className="pattern-card-time">{prediction.departureTime}</span>
        </div>
        <div className="pattern-card-confidence-row">
          <span className="pattern-card-label">신뢰도</span>
          <div className="pattern-card-confidence-bar-wrap">
            <div
              className="pattern-card-confidence-bar"
              role="progressbar"
              aria-valuenow={confidencePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`신뢰도 ${confidencePercent}%`}
            >
              <div
                className="pattern-card-confidence-fill"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="pattern-card-confidence-value">{confidencePercent}%</span>
          </div>
        </div>
        {topFactor && (
          <div className="pattern-card-factor">
            <span className="pattern-card-factor-label">{topFactor.label}</span>
            <span className="pattern-card-factor-impact">
              {topFactor.impact > 0 ? '+' : ''}{topFactor.impact}분
            </span>
          </div>
        )}
      </div>
      <span className="pattern-card-cta">패턴 분석 보기</span>
    </Link>
  );
}

function FullState({ prediction }: { prediction: PredictionResponse }): JSX.Element {
  const confidencePercent = formatConfidencePercent(prediction.confidence);
  const topFactors = prediction.contributingFactors.slice(0, 2);

  return (
    <Link to="/patterns" className="pattern-card pattern-card--full" aria-label="패턴 분석 보기">
      <div className="pattern-card-header">
        <span className="pattern-card-icon" aria-hidden="true">
          <PatternIconSvg />
        </span>
        <span className="pattern-card-title">출발 패턴 분석</span>
        <span className="pattern-card-arrow" aria-hidden="true">&rsaquo;</span>
      </div>
      <div className="pattern-card-body">
        <div className="pattern-card-time-row">
          <span className="pattern-card-label">예상 출발</span>
          <div className="pattern-card-time-detail">
            <span className="pattern-card-time">{prediction.departureTime}</span>
            <span className="pattern-card-range">
              {prediction.departureRange.early} ~ {prediction.departureRange.late}
            </span>
          </div>
        </div>
        <div className="pattern-card-confidence-row">
          <span className="pattern-card-label">신뢰도</span>
          <div className="pattern-card-confidence-bar-wrap">
            <div
              className="pattern-card-confidence-bar"
              role="progressbar"
              aria-valuenow={confidencePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`신뢰도 ${confidencePercent}%`}
            >
              <div
                className="pattern-card-confidence-fill"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="pattern-card-confidence-value">{confidencePercent}%</span>
          </div>
        </div>
        {topFactors.length > 0 && (
          <div className="pattern-card-factors">
            {topFactors.map((factor) => (
              <div key={factor.type} className="pattern-card-factor">
                <span className="pattern-card-factor-label">{factor.label}</span>
                <span className="pattern-card-factor-impact">
                  {factor.impact > 0 ? '+' : ''}{factor.impact}분
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="pattern-card-cta">패턴 분석 보기</span>
    </Link>
  );
}

export const PatternInsightsCard = memo(function PatternInsightsCard(): JSX.Element | null {
  const { userId } = useAuth();
  const { data: prediction, isLoading, isError } = usePredictionQuery(userId);

  if (!userId) return null;
  if (isLoading || isError || !prediction) return null;

  if (isColdStart(prediction.tier)) {
    return <ColdStartState dataStatus={prediction.dataStatus} />;
  }

  if (isLearning(prediction.tier)) {
    return <LearningState prediction={prediction} />;
  }

  return <FullState prediction={prediction} />;
});

function PatternIconSvg(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
