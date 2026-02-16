import type { WizardStep } from './types';

interface WizardNavButtonsProps {
  readonly step: WizardStep;
  readonly canProceed: boolean;
  readonly isSubmitting: boolean;
  readonly success: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onSubmit: () => void;
}

export function WizardNavButtons({
  step,
  canProceed,
  isSubmitting,
  success,
  onBack,
  onNext,
  onSubmit,
}: WizardNavButtonsProps): JSX.Element {
  return (
    <>
      <div className="wizard-nav">
        {step !== 'type' && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            &larr; 이전
          </button>
        )}

        {step !== 'confirm' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canProceed}
          >
            다음 &rarr;
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={isSubmitting || !!success}
          >
            {success ? (
              '✓ 완료!'
            ) : isSubmitting ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                저장 중...
              </>
            ) : (
              '알림 시작하기'
            )}
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      {canProceed && !success && (
        <p className="keyboard-hint" aria-hidden="true">
          <kbd>Enter</kbd> 키로 다음 단계로 이동
        </p>
      )}
    </>
  );
}
