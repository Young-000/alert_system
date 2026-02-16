interface TypeSelectionStepProps {
  readonly wantsWeather: boolean;
  readonly wantsTransport: boolean;
  readonly isSubmitting: boolean;
  readonly userId: string;
  readonly error: string;
  readonly success: string;
  readonly onToggleWeather: () => void;
  readonly onToggleTransport: () => void;
  readonly onQuickWeather: () => void;
  readonly onClearError: () => void;
}

export function TypeSelectionStep({
  wantsWeather,
  wantsTransport,
  isSubmitting,
  userId,
  error,
  success,
  onToggleWeather,
  onToggleTransport,
  onQuickWeather,
  onClearError,
}: TypeSelectionStepProps): JSX.Element {
  return (
    <section className="wizard-step">
      {/* 알림톡 안내 배너 */}
      <div className="alimtalk-banner">
        <span className="alimtalk-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </span>
        <div className="alimtalk-text">
          <strong>카카오 알림톡으로 알림을 받아요</strong>
          <span className="muted">회원가입 시 등록한 전화번호로 발송됩니다</span>
        </div>
      </div>

      {/* Quick Action: One-click Weather Alert */}
      <div className="quick-action-card">
        <div className="quick-action-content">
          <span className="quick-action-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 18a5 5 0 0 0-10 0" />
              <line x1="12" y1="9" x2="12" y2="2" />
              <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
              <line x1="1" y1="18" x2="3" y2="18" />
              <line x1="21" y1="18" x2="23" y2="18" />
              <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
            </svg>
          </span>
          <div className="quick-action-text">
            <strong>날씨 알림 바로 시작</strong>
            <span className="muted">매일 오전 8시 날씨 + 미세먼지 알림톡</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={onQuickWeather}
          disabled={isSubmitting || !userId}
        >
          {isSubmitting ? '설정 중...' : '원클릭 설정'}
        </button>
      </div>

      {/* Quick action feedback messages */}
      <div aria-live="polite" aria-atomic="true" className="toast-container">
        {error && (
          <div className="toast toast-error" role="alert">
            <span className="toast-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className="toast-message">{error}</span>
            <button
              type="button"
              className="toast-close"
              onClick={onClearError}
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
        )}
        {success && (
          <div className="toast toast-success" role="status">
            <span className="toast-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <span className="toast-message">{success}</span>
          </div>
        )}
      </div>

      <div className="divider-text">
        <span>또는 직접 설정</span>
      </div>

      <h1>어떤 정보를 받고 싶으세요?</h1>
      <p className="muted">복수 선택 가능해요</p>

      <div className="choice-grid" role="group" aria-label="알림 유형 선택">
        <button
          type="button"
          className={`choice-card ${wantsWeather ? 'active' : ''}`}
          onClick={onToggleWeather}
          aria-pressed={wantsWeather}
          aria-label="날씨 알림 선택"
        >
          <span className="choice-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 18a5 5 0 0 0-10 0" />
              <line x1="12" y1="9" x2="12" y2="2" />
              <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
              <line x1="1" y1="18" x2="3" y2="18" />
              <line x1="21" y1="18" x2="23" y2="18" />
              <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
            </svg>
          </span>
          <span className="choice-title">날씨</span>
          <span className="choice-desc">오늘 뭐 입지? 우산 필요해?</span>
        </button>

        <button
          type="button"
          className={`choice-card ${wantsTransport ? 'active' : ''}`}
          onClick={onToggleTransport}
          aria-pressed={wantsTransport}
          aria-label="교통 알림 선택"
        >
          <span className="choice-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="10" y2="21" />
            </svg>
          </span>
          <span className="choice-title">교통</span>
          <span className="choice-desc">지하철/버스 실시간 도착</span>
        </button>
      </div>
    </section>
  );
}
