import type { LocalTransportMode, SelectedStop, SetupStep } from './types';
import { RouteSoFar } from './RouteSoFar';
import type { RouteType } from '@infrastructure/api/commute-api.client';

interface TransportStepProps {
  currentTransport: LocalTransportMode;
  onTransportChange: (mode: LocalTransportMode) => void;
  selectedStops: SelectedStop[];
  routeType: RouteType;
  onStepChange: (step: SetupStep) => void;
}

export function TransportStep({
  currentTransport,
  onTransportChange,
  selectedStops,
  routeType,
  onStepChange,
}: TransportStepProps): JSX.Element {
  return (
    <section className="apple-step">
      <div className="apple-step-content">
        <h1 className="apple-question">
          {selectedStops.length === 0
            ? '어떤 교통수단을\n타세요?'
            : '다음은 어떤\n교통수단이에요?'}
        </h1>

        {selectedStops.length > 0 && (
          <RouteSoFar routeType={routeType} selectedStops={selectedStops} />
        )}

        {/* 개선된 교통수단 선택기 */}
        <div className="transport-selector" role="radiogroup" aria-label="교통수단 선택">
          <button
            type="button"
            role="radio"
            aria-checked={currentTransport === 'subway'}
            className={`transport-option ${currentTransport === 'subway' ? 'selected' : ''}`}
            onClick={() => onTransportChange('subway')}
          >
            <span className="transport-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="10" y2="21"/></svg></span>
            <div className="transport-text">
              <span className="transport-label">지하철</span>
              <span className="transport-desc">역 이름으로 검색</span>
            </div>
            {currentTransport === 'subway' && (
              <span className="transport-check" aria-hidden="true">✓</span>
            )}
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={currentTransport === 'bus'}
            className={`transport-option ${currentTransport === 'bus' ? 'selected' : ''}`}
            onClick={() => onTransportChange('bus')}
          >
            <span className="transport-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 21l2-4"/><path d="M17 21l-2-4"/></svg></span>
            <div className="transport-text">
              <span className="transport-label">버스</span>
              <span className="transport-desc">정류장으로 검색</span>
            </div>
            {currentTransport === 'bus' && (
              <span className="transport-check" aria-hidden="true">✓</span>
            )}
          </button>
        </div>
      </div>

      <div className="apple-step-footer">
        <button
          type="button"
          className="apple-btn-secondary"
          onClick={() => onStepChange(selectedStops.length === 0 ? 'select-type' : 'ask-more')}
        >
          이전
        </button>
        <button
          type="button"
          className="apple-btn-primary"
          onClick={() => onStepChange('select-station')}
        >
          다음
        </button>
      </div>
    </section>
  );
}
