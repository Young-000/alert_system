interface WizardStepIndicatorProps {
  readonly progress: { current: number; total: number };
  readonly wantsTransport: boolean;
  readonly isConfirmStep: boolean;
}

export function WizardStepIndicator({
  progress,
  wantsTransport,
  isConfirmStep,
}: WizardStepIndicatorProps): JSX.Element {
  return (
    <>
      <div className="step-indicator" role="group" aria-label="설정 단계 진행 상황" aria-roledescription="progress">
        <div className={`step-item ${progress.current >= 1 ? 'active' : ''} ${progress.current > 1 ? 'completed' : ''}`}>
          <div className="step-number">{progress.current > 1 ? '✓' : '1'}</div>
          <div className="step-label">유형</div>
        </div>
        <div className="step-connector" />
        {wantsTransport && (
          <>
            <div className={`step-item ${progress.current >= 2 ? 'active' : ''} ${progress.current > 2 ? 'completed' : ''}`}>
              <div className="step-number">{progress.current > 2 ? '✓' : '2'}</div>
              <div className="step-label">교통</div>
            </div>
            <div className="step-connector" />
            <div className={`step-item ${progress.current >= 3 ? 'active' : ''} ${progress.current > 3 ? 'completed' : ''}`}>
              <div className="step-number">{progress.current > 3 ? '✓' : '3'}</div>
              <div className="step-label">역</div>
            </div>
            <div className="step-connector" />
          </>
        )}
        <div className={`step-item ${isConfirmStep || progress.current >= (wantsTransport ? 4 : 2) ? 'active' : ''} ${isConfirmStep ? 'completed' : ''}`}>
          <div className="step-number">{isConfirmStep ? '✓' : (wantsTransport ? '4' : '2')}</div>
          <div className="step-label">시간</div>
        </div>
        <div className="step-connector" />
        <div className={`step-item ${isConfirmStep ? 'active' : ''}`}>
          <div className="step-number">{wantsTransport ? '5' : '3'}</div>
          <div className="step-label">확인</div>
        </div>
      </div>
      <p className="progress-text">{progress.current} / {progress.total} 단계</p>
    </>
  );
}
