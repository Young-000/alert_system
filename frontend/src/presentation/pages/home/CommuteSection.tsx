import { Link } from 'react-router-dom';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { TransitArrivalInfo } from './route-utils';

interface CommuteSectionProps {
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;
  forceRouteType: 'auto' | 'morning' | 'evening';
  onForceRouteTypeChange: (v: 'auto' | 'morning' | 'evening') => void;
  transitInfos: TransitArrivalInfo[];
  isCommuteStarting: boolean;
  onStartCommute: () => void;
}

export function CommuteSection({
  routes,
  activeRoute,
  forceRouteType,
  onForceRouteTypeChange,
  transitInfos,
  isCommuteStarting,
  onStartCommute,
}: CommuteSectionProps): JSX.Element {
  const hasRoutes = routes.length > 0;

  return (
    <section id="today-card" className="today-card" aria-label="오늘의 출퇴근">
      {hasRoutes && activeRoute ? (
        <>
          {/* Route type toggle */}
          {routes.length > 1 && (
            <div className="route-type-toggle" role="group" aria-label="경로 유형 선택">
              {(['auto', 'morning', 'evening'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`route-type-btn ${forceRouteType === type ? 'active' : ''}`}
                  onClick={() => onForceRouteTypeChange(type)}
                  aria-pressed={forceRouteType === type}
                >
                  {type === 'auto' ? '자동' : type === 'morning' ? '출근' : '퇴근'}
                </button>
              ))}
            </div>
          )}

          {/* Route Info */}
          <div className="today-route-info">
            <div className="today-route-badge">
              {activeRoute.routeType === 'morning' ? '출근' : '퇴근'}
            </div>
            <h2 className="today-route-name">{activeRoute.name}</h2>
            <p className="today-route-detail">
              {(() => {
                const names = activeRoute.checkpoints.map(cp => cp.name).filter(Boolean);
                if (names.length <= 3) return names.join(' \u2192 ');
                return `${names[0]} \u2192 (${names.length - 2}\uacf3 \uacbd\uc720) \u2192 ${names[names.length - 1]}`;
              })()}
            </p>
          </div>

          {/* Transit Arrivals */}
          {transitInfos.length > 0 && (
            <div className="today-transit">
              {transitInfos.map((info, idx) => (
                <div key={idx} className="today-transit-item">
                  <span className="today-transit-badge" data-type={info.type}>
                    {info.type === 'subway' ? '지하철' : '버스'}
                  </span>
                  <span className="today-transit-name">{info.name}</span>
                  {info.isLoading ? (
                    <span className="spinner spinner-sm" aria-hidden="true" />
                  ) : info.error ? (
                    <span className="today-transit-time muted" role="alert">{info.error}</span>
                  ) : info.arrivals.length > 0 ? (
                    <span className="today-transit-time">
                      {(() => {
                        const a = info.arrivals[0];
                        if ('routeName' in a) return `${a.routeName} ${a.arrivalTime > 0 ? `${a.arrivalTime}분` : '곧 도착'}`;
                        return `${a.destination}행 ${a.arrivalTime > 0 ? `${a.arrivalTime}분` : '곧 도착'}`;
                      })()}
                    </span>
                  ) : (
                    <span className="today-transit-time muted">정보 없음</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Start Button */}
          <button
            type="button"
            className="today-start-btn"
            onClick={onStartCommute}
            disabled={isCommuteStarting}
          >
            {isCommuteStarting ? '시작 중...' : '출발하기'}
          </button>
        </>
      ) : (
        /* No Route: Onboarding CTA */
        <div className="today-empty">
          <h2>출근 경로를 등록해보세요</h2>
          <p>경로를 등록하면 날씨, 도착정보, 기록이 자동으로 연결됩니다.</p>
          <Link to="/routes" className="btn btn-primary">경로 등록하기</Link>
        </div>
      )}
    </section>
  );
}
