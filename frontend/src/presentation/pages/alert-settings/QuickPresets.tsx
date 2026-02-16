import type { Alert } from '@infrastructure/api';

interface QuickPresetsProps {
  readonly alerts: Alert[];
  readonly isSubmitting: boolean;
  readonly onQuickWeather: () => void;
}

export function QuickPresets({
  alerts,
  isSubmitting,
  onQuickWeather,
}: QuickPresetsProps): JSX.Element {
  const hasWeatherAlert = !!alerts.find(a => a.name === '아침 날씨 알림');

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
