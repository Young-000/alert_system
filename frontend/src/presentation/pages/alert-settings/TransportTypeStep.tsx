import type { RouteResponse } from '@infrastructure/api/commute-api.client';

interface TransportTypeStepProps {
  readonly transportTypes: ('subway' | 'bus')[];
  readonly savedRoutes: RouteResponse[];
  readonly showRouteImport: boolean;
  readonly onToggleTransportType: (type: 'subway' | 'bus') => void;
  readonly onShowRouteImport: () => void;
  readonly onHideRouteImport: () => void;
  readonly onImportFromRoute: (route: RouteResponse) => void;
}

export function TransportTypeStep({
  transportTypes,
  savedRoutes,
  showRouteImport,
  onToggleTransportType,
  onShowRouteImport,
  onHideRouteImport,
  onImportFromRoute,
}: TransportTypeStepProps): JSX.Element {
  return (
    <section className="wizard-step">
      <h1>어떤 교통수단을 이용하세요?</h1>
      <p className="muted">복수 선택 가능해요</p>

      {/* 경로에서 가져오기 옵션 */}
      {savedRoutes.length > 0 && !showRouteImport && (
        <div className="route-import-banner">
          <span className="import-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <div className="import-text">
            <strong>저장된 경로에서 가져오기</strong>
            <span className="muted">기존 출퇴근 경로의 역/정류장을 사용해요</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onShowRouteImport}
          >
            선택
          </button>
        </div>
      )}

      {/* 경로 선택 목록 */}
      {showRouteImport && (
        <div className="route-import-list">
          <div className="import-list-header">
            <h3>경로 선택</h3>
            <button
              type="button"
              className="btn-close"
              onClick={onHideRouteImport}
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
          {savedRoutes.map(route => {
            const subwayStops = route.checkpoints.filter(c => c.checkpointType === 'subway');
            const busStops = route.checkpoints.filter(c => c.checkpointType === 'bus_stop');
            if (subwayStops.length === 0 && busStops.length === 0) return null;

            return (
              <button
                key={route.id}
                type="button"
                className="route-import-item"
                onClick={() => onImportFromRoute(route)}
              >
                <span className={`route-type-badge ${route.routeType === 'morning' ? 'morning' : 'evening'}`}>
                  {route.routeType === 'morning' ? '출근' : '퇴근'}
                </span>
                <div className="route-import-info">
                  <span className="route-name">{route.name}</span>
                  <span className="route-stops">
                    {subwayStops.map(s => s.name).join(', ')}
                    {subwayStops.length > 0 && busStops.length > 0 ? ' · ' : ''}
                    {busStops.map(s => s.name).join(', ')}
                  </span>
                </div>
                <span className="route-action">사용 &rarr;</span>
              </button>
            );
          })}
        </div>
      )}

      {!showRouteImport && (
        <div className="divider-text">
          <span>또는 직접 선택</span>
        </div>
      )}

      <div className="choice-grid" role="group" aria-label="교통수단 선택">
        <button
          type="button"
          className={`choice-card ${transportTypes.includes('subway') ? 'active' : ''}`}
          onClick={() => onToggleTransportType('subway')}
          aria-pressed={transportTypes.includes('subway')}
          aria-label="지하철 선택"
        >
          <span className="choice-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="10" y2="21" />
            </svg>
          </span>
          <span className="choice-title">지하철</span>
        </button>

        <button
          type="button"
          className={`choice-card ${transportTypes.includes('bus') ? 'active' : ''}`}
          onClick={() => onToggleTransportType('bus')}
          aria-pressed={transportTypes.includes('bus')}
          aria-label="버스 선택"
        >
          <span className="choice-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
              <path d="M7 21l2-4" />
              <path d="M17 21l-2-4" />
            </svg>
          </span>
          <span className="choice-title">버스</span>
        </button>
      </div>
    </section>
  );
}
