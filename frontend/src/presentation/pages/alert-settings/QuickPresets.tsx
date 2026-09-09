interface QuickPresetsProps {
  /**
   * 프리셋이 만들 알림이 이미 있는지. 예전에는 이 컴포넌트가 알림 **이름**으로
   * 직접 판단했다 — 위저드로 만든 같은 알림에 다른 이름이 붙어 있으면 버튼이
   * 열린 채였고, 누르면 08시에 알림톡이 두 통 나가는 상태가 됐다.
   * 판단은 `use-alert-crud`가 생성과 같은 규칙으로 한 번만 한다.
   */
  readonly hasWeatherAlert: boolean;
  readonly isSubmitting: boolean;
  readonly onQuickWeather: () => void;
}

export function QuickPresets({
  hasWeatherAlert,
  isSubmitting,
  onQuickWeather,
}: QuickPresetsProps): JSX.Element {

  return (
    <section className="alert-presets">
      <h2 className="preset-title">빠른 알림 설정</h2>
      <div className="preset-cards">
        <button
          type="button"
          className="preset-card"
          onClick={onQuickWeather}
          disabled={isSubmitting || hasWeatherAlert}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 18a5 5 0 0 0-10 0" />
            <line x1="12" y1="9" x2="12" y2="2" />
            <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
            <line x1="1" y1="18" x2="3" y2="18" />
            <line x1="21" y1="18" x2="23" y2="18" />
            <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          </svg>
          <span className="preset-label">날씨 + 미세먼지</span>
          <span className="preset-desc">매일 오전 8시</span>
          {hasWeatherAlert && <span className="preset-done">설정됨</span>}
        </button>
      </div>
    </section>
  );
}
