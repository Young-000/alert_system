import type { AlternativeSuggestionResponse, AlternativeStepResponse } from '@infrastructure/api/commute-api.client';

interface AlternativeCardProps {
  readonly alternative: AlternativeSuggestionResponse;
}

const STEP_ICONS: Record<AlternativeStepResponse['action'], string> = {
  walk: '\u{1F6B6}',
  subway: '\u{1F687}',
  bus: '\u{1F68C}',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export function AlternativeCard({ alternative }: AlternativeCardProps): JSX.Element {
  const { description, savingsMinutes, steps, totalDurationMinutes, confidence } = alternative;

  return (
    <div className="alt-card" data-testid="alternative-card">
      <div className="alt-card-header">
        <p className="alt-card-desc">{description}</p>
        {savingsMinutes > 0 && (
          <span className="alt-card-savings" data-testid="savings-badge">
            {savingsMinutes}분 단축
          </span>
        )}
      </div>

      {steps.length > 0 && (
        <div className="alt-card-steps" role="list" aria-label="대안 경로 단계">
          {steps.map((step, idx) => (
            <div className="alt-step" role="listitem" key={idx}>
              <span
                className={`alt-step-icon alt-step-icon--${step.action}`}
                aria-hidden="true"
              >
                {STEP_ICONS[step.action]}
              </span>
              <span className="alt-step-text">
                {step.from}
                {step.to ? ` → ${step.to}` : ''}
                {step.line ? ` (${step.line})` : ''}
              </span>
              <span className="alt-step-duration">{step.durationMinutes}분</span>
            </div>
          ))}
        </div>
      )}

      <div className="alt-card-footer">
        <span className="alt-card-confidence" data-testid="confidence-indicator">
          <span className={`alt-confidence-dot alt-confidence-dot--${confidence}`} />
          <span className="alt-confidence-label">
            신뢰도 {CONFIDENCE_LABELS[confidence] ?? confidence}
          </span>
        </span>
        <span className="alt-card-total">
          총 {totalDurationMinutes}분
        </span>
      </div>
    </div>
  );
}
