import type { RouteType } from '@infrastructure/api/commute-api.client';
import type { SetupStep } from './types';

interface RouteTypeStepProps {
  routeType: RouteType;
  onRouteTypeChange: (type: RouteType) => void;
  onNext: (step: SetupStep) => void;
}

export function RouteTypeStep({
  routeType,
  onRouteTypeChange,
  onNext,
}: RouteTypeStepProps): JSX.Element {
  return (
    <section className="apple-step">
      <div className="apple-step-content">
        <h1 className="apple-question">어떤 경로를<br />만들까요?</h1>

        <div className="apple-type-cards">
          <button
            type="button"
            className={`apple-type-card ${routeType === 'morning' ? 'selected' : ''}`}
            onClick={() => onRouteTypeChange('morning')}
          >
            <span className="type-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg></span>
            <span className="type-label">출근</span>
            <span className="type-desc">집 → 회사</span>
          </button>

          <button
            type="button"
            className={`apple-type-card ${routeType === 'evening' ? 'selected' : ''}`}
            onClick={() => onRouteTypeChange('evening')}
          >
            <span className="type-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
            <span className="type-label">퇴근</span>
            <span className="type-desc">회사 → 집</span>
          </button>
        </div>
      </div>

      <div className="apple-step-footer">
        <button
          type="button"
          className="apple-btn-primary apple-btn-full"
          onClick={() => onNext('select-transport')}
        >
          다음
        </button>
      </div>
    </section>
  );
}
