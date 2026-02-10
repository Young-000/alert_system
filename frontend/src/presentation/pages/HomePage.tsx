import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { behaviorCollector, BehaviorEventType } from '@infrastructure/analytics/behavior-collector';
import { alertApiClient, weatherApiClient, airQualityApiClient, busApiClient, subwayApiClient } from '@infrastructure/api';
import type { Alert, WeatherData, AirQualityData, BusArrival, SubwayArrival } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse, type CommuteStatsResponse, type RouteAnalyticsResponse, type AnalyticsSummaryResponse } from '@infrastructure/api/commute-api.client';

function getInitialLoginState(): boolean {
  return !!localStorage.getItem('userId');
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽이에요';
  if (hour < 9) return '좋은 아침이에요';
  if (hour < 12) return '좋은 오전이에요';
  if (hour < 14) return '점심 시간이에요';
  if (hour < 18) return '좋은 오후에요';
  if (hour < 21) return '좋은 저녁이에요';
  return '좋은 밤이에요';
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny') || c === '맑음') return '☀️';
  if (c.includes('cloud') || c === '구름많음') return '☁️';
  if (c.includes('overcast') || c === '흐림') return '🌥️';
  if (c.includes('rain') || c === '비') return '🌧️';
  if (c.includes('snow') || c === '눈') return '❄️';
  if (c.includes('thunder') || c === '뇌우') return '⛈️';
  return '🌤️';
}

function getAqiStatus(pm10: number | undefined): { label: string; className: string } {
  if (pm10 == null) return { label: '-', className: '' };
  if (pm10 <= 30) return { label: '좋음', className: 'aqi-good' };
  if (pm10 <= 80) return { label: '보통', className: 'aqi-moderate' };
  if (pm10 <= 150) return { label: '나쁨', className: 'aqi-bad' };
  return { label: '매우나쁨', className: 'aqi-very-bad' };
}

function getActiveRoute(
  routes: RouteResponse[],
  forceType?: 'auto' | 'morning' | 'evening'
): RouteResponse | null {
  const hour = new Date().getHours();
  const isMorning = forceType === 'auto' || !forceType
    ? hour < 14
    : forceType === 'morning';

  const preferred = routes.find(r =>
    r.isPreferred && (isMorning ? r.routeType === 'morning' : r.routeType === 'evening')
  );
  if (preferred) return preferred;

  const timeMatch = routes.find(r =>
    isMorning ? r.routeType === 'morning' : r.routeType === 'evening'
  );
  if (timeMatch) return timeMatch;

  return routes[0] || null;
}

interface TransitArrivalInfo {
  type: 'bus' | 'subway';
  name: string;
  arrivals: (BusArrival | SubwayArrival)[];
  isLoading: boolean;
}

// ─── Guest Landing Page ────────────────────────────

function GuestLanding(): JSX.Element {
  return (
    <main className="page guest-page">
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <div className="guest-top-bar">
        <strong className="guest-brand">출퇴근 메이트</strong>
        <Link className="btn btn-primary btn-sm" to="/login">시작하기</Link>
      </div>

      <section id="main-content" className="guest-hero">
        <div className="guest-hero-content">
          <h1 className="guest-headline">출퇴근을<br />책임지는 앱</h1>
          <p className="guest-sub">
            날씨, 교통, 이동시간까지.<br />
            매일 아침 알림 하나로 시작하세요.
          </p>
          <Link className="btn btn-primary btn-lg guest-cta" to="/login">
            무료로 시작하기
          </Link>
        </div>
      </section>

      <section className="guest-features">
        <div className="guest-feature-card">
          <div className="guest-feature-num">1</div>
          <h3>경로 등록</h3>
          <p>출근 경로를 한 번만 등록하세요</p>
        </div>
        <div className="guest-feature-card">
          <div className="guest-feature-num">2</div>
          <h3>자동 알림</h3>
          <p>날씨 + 도착정보가 알아서 옵니다</p>
        </div>
        <div className="guest-feature-card">
          <div className="guest-feature-num">3</div>
          <h3>기록 & 분석</h3>
          <p>출발/도착만 누르면 패턴이 쌓여요</p>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트</p>
      </footer>
    </main>
  );
}

// ─── Logged-In Dashboard ───────────────────────────

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const isLoggedIn = getInitialLoginState();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [commuteStats, setCommuteStats] = useState<CommuteStatsResponse | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [transitInfos, setTransitInfos] = useState<TransitArrivalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [isCommuteStarting, setIsCommuteStarting] = useState(false);
  const [forceRouteType, setForceRouteType] = useState<'auto' | 'morning' | 'evening'>('auto');
  const [recommendedRoute, setRecommendedRoute] = useState<RouteAnalyticsResponse | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResponse | null>(null);

  const userId = localStorage.getItem('userId') || '';
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // Load core data
  const loadCoreData = useCallback(async (): Promise<void> => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);

    try {
      const commuteApi = getCommuteApiClient();
      const [alertsData, routesData, statsData] = await Promise.all([
        alertApiClient.getAlertsByUser(userId).catch(() => []),
        commuteApi.getUserRoutes(userId).catch(() => []),
        commuteApi.getStats(userId, 7).catch(() => null),
      ]);

      // If all three failed (empty arrays + null), show error
      if (alertsData.length === 0 && routesData.length === 0 && statsData === null) {
        // Check if it's a real error vs genuinely empty data
        try {
          await alertApiClient.getAlertsByUser(userId);
        } catch {
          setLoadError(true);
        }
      }

      setAlerts(alertsData);
      setRoutes(routesData);
      setCommuteStats(statsData);

      // Load analytics data (non-blocking)
      if (routesData.length >= 2) {
        commuteApi.getRecommendedRoutes(userId, 1)
          .then(recs => { if (recs.length > 0) setRecommendedRoute(recs[0]); })
          .catch(() => {});
      }
      commuteApi.getAnalyticsSummary(userId)
        .then(summary => { if (summary.totalTrips >= 3) setAnalyticsSummary(summary); })
        .catch(() => {});
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  // Load weather + air quality
  useEffect(() => {
    let isMounted = true;
    if (!userId) return;

    const lat = 37.5665;
    const lng = 126.978;
    setWeatherError(false);

    weatherApiClient.getCurrentWeather(lat, lng)
      .then(data => { if (isMounted) setWeather(data); })
      .catch(() => { if (isMounted) setWeatherError(true); });

    airQualityApiClient.getByLocation(lat, lng)
      .then(data => { if (isMounted) setAirQualityData(data); })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [userId]);

  // Load transit arrivals based on active route
  const activeRoute = useMemo(() => getActiveRoute(routes, forceRouteType), [routes, forceRouteType]);

  const loadTransitArrivals = useCallback(async (route: RouteResponse): Promise<void> => {
    const subwayStations = new Set<string>();
    const busStopIds = new Set<string>();

    for (const cp of route.checkpoints) {
      if (cp.transportMode === 'subway' && cp.name) {
        const stationName = cp.name.replace(/역$/, '').replace(/\s*\d+호선.*$/, '');
        subwayStations.add(stationName);
      }
      if (cp.transportMode === 'bus' && cp.linkedBusStopId) {
        busStopIds.add(cp.linkedBusStopId);
      }
    }

    const infos: TransitArrivalInfo[] = [];
    const stationNames = Array.from(subwayStations).slice(0, 2);
    const stopIds = Array.from(busStopIds).slice(0, 2);

    for (const name of stationNames) {
      infos.push({ type: 'subway', name: `${name}역`, arrivals: [], isLoading: true });
    }
    for (const id of stopIds) {
      infos.push({ type: 'bus', name: `정류장 ${id}`, arrivals: [], isLoading: true });
    }
    setTransitInfos([...infos]);

    const promises: Promise<void>[] = [];
    stationNames.forEach((name, idx) => {
      promises.push(
        subwayApiClient.getArrival(name)
          .then(arrivals => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === idx ? { ...info, arrivals: arrivals.slice(0, 3), isLoading: false } : info
            ));
          })
          .catch(() => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === idx ? { ...info, isLoading: false } : info
            ));
          })
      );
    });

    const subwayCount = stationNames.length;
    stopIds.forEach((id, idx) => {
      promises.push(
        busApiClient.getArrival(id)
          .then(arrivals => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === subwayCount + idx
                ? { ...info, arrivals: arrivals.slice(0, 3), isLoading: false }
                : info
            ));
          })
          .catch(() => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === subwayCount + idx ? { ...info, isLoading: false } : info
            ));
          })
      );
    });

    await Promise.allSettled(promises);
    // Track transit info viewed
    behaviorCollector.trackTransitInfoViewed();
  }, []);

  useEffect(() => {
    if (activeRoute) {
      loadTransitArrivals(activeRoute);
    }
  }, [activeRoute, loadTransitArrivals]);

  // Next alert time
  const nextAlert = useMemo((): { time: string; label: string } | null => {
    const enabled = alerts.filter(a => a.enabled);
    if (enabled.length === 0) return null;

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();

    let best: { h: number; m: number; label: string; isToday: boolean } | null = null;

    for (const alert of enabled) {
      const parts = alert.schedule.split(' ');
      if (parts.length < 2) continue;
      const cronMin = isNaN(Number(parts[0])) ? 0 : Number(parts[0]);
      const hours = parts[1].includes(',')
        ? parts[1].split(',').map(Number).filter(h => !isNaN(h))
        : [Number(parts[1])].filter(h => !isNaN(h));

      const label = alert.alertTypes.includes('weather') ? '날씨' : '교통';

      for (const h of hours) {
        const isToday = h > curH || (h === curH && cronMin > curM);
        if (!best || (isToday && !best.isToday) ||
            (isToday === best.isToday && (h < best.h || (h === best.h && cronMin < best.m)))) {
          best = { h, m: cronMin, label, isToday };
        }
      }
    }

    if (!best) return null;
    const timeStr = `${String(best.h).padStart(2, '0')}:${String(best.m).padStart(2, '0')}`;
    return {
      time: best.isToday ? timeStr : `내일 ${timeStr}`,
      label: best.label,
    };
  }, [alerts]);

  const airQuality = useMemo(() => getAqiStatus(airQualityData?.pm10), [airQualityData]);

  const handleStartCommute = async (): Promise<void> => {
    if (!activeRoute || isCommuteStarting) return;
    setIsCommuteStarting(true);

    // Track behavior event
    behaviorCollector.trackEvent(
      BehaviorEventType.DEPARTURE_CONFIRMED,
      { metadata: { routeId: activeRoute.id, routeName: activeRoute.name }, source: 'app' }
    );

    try {
      const commuteApi = getCommuteApiClient();
      const session = await commuteApi.startSession({
        userId,
        routeId: activeRoute.id,
        weatherCondition: weather?.condition,
      });
      navigate('/commute', { state: { sessionId: session.id, routeId: activeRoute.id } });
    } catch {
      // Fallback: navigate to commute page to start there
      navigate('/commute', { state: { routeId: activeRoute.id } });
    } finally {
      setIsCommuteStarting(false);
    }
  };

  if (!isLoggedIn) return <GuestLanding />;

  if (isLoading) {
    return (
      <main className="page home-page">
        <div className="home-header">
          <span className="home-greeting-skeleton skeleton" style={{ width: '160px', height: '24px' }} />
        </div>
        <div className="today-card skeleton-card" style={{ height: '200px' }} />
        <div className="today-card skeleton-card" style={{ height: '120px', marginTop: '12px' }} />
      </main>
    );
  }

  const hasRoutes = routes.length > 0;

  // Determine if recommended route differs from active route
  const showRecommendation = recommendedRoute && activeRoute
    && recommendedRoute.routeId !== activeRoute.id
    && routes.length >= 2;

  // Departure time hint from analytics summary
  const departureHint = analyticsSummary?.insights?.[0] || null;

  return (
    <main className="page home-page">
      <a href="#today-card" className="skip-link">본문으로 건너뛰기</a>

      {/* Error Recovery Banner */}
      {loadError && (
        <div className="home-error-banner" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>데이터를 불러오지 못했어요</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={loadCoreData}>
            다시 시도
          </button>
        </div>
      )}

      {/* Header */}
      <header className="home-header">
        <div>
          <h1 className="home-greeting">{getGreeting()}</h1>
          {userName && <p className="home-user-name">{userName}님</p>}
        </div>
        {weather && (
          <div className="home-weather-badge">
            <span>{getWeatherIcon(weather.condition)}</span>
            <span className="home-weather-temp">{Math.round(weather.temperature)}°</span>
          </div>
        )}
      </header>

      {/* Route type toggle */}
      {hasRoutes && routes.length > 1 && (
        <div className="route-type-toggle">
          {(['auto', 'morning', 'evening'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`route-type-btn ${forceRouteType === type ? 'active' : ''}`}
              onClick={() => setForceRouteType(type)}
            >
              {type === 'auto' ? '자동' : type === 'morning' ? '출근' : '퇴근'}
            </button>
          ))}
        </div>
      )}

      {/* Today's Commute Card */}
      <section id="today-card" className="today-card" aria-label="오늘의 출퇴근">
        {hasRoutes && activeRoute ? (
          <>
            {/* Weather Strip */}
            {weather && (
              <div className="today-weather-strip">
                <span>{getWeatherIcon(weather.condition)} {Math.round(weather.temperature)}° {weather.conditionKr || weather.condition}</span>
                <span className="today-weather-detail">
                  습도 {weather.humidity}%
                  {airQuality.label !== '-' && (
                    <> · 미세먼지 <span className={airQuality.className}>{airQuality.label}</span></>
                  )}
                </span>
              </div>
            )}

            {/* Route Info */}
            <div className="today-route-info">
              <div className="today-route-badge">
                {activeRoute.routeType === 'morning' ? '출근' : '퇴근'}
              </div>
              <h2 className="today-route-name">{activeRoute.name}</h2>
              <p className="today-route-detail">
                {activeRoute.checkpoints.map(cp => cp.name).filter(Boolean).join(' → ')}
              </p>
            </div>

            {/* Transit Arrivals (from this route) */}
            {transitInfos.length > 0 && (
              <div className="today-transit">
                {transitInfos.map((info, idx) => (
                  <div key={idx} className="today-transit-item">
                    <span className="today-transit-badge" data-type={info.type}>
                      {info.type === 'subway' ? '지하철' : '버스'}
                    </span>
                    <span className="today-transit-name">{info.name}</span>
                    {info.isLoading ? (
                      <span className="spinner spinner-sm" />
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

            {/* Recommended Route Badge */}
            {showRecommendation && (
              <div className="today-recommend-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>
                  <strong>{recommendedRoute.routeName}</strong>이 더 빠를 수 있어요
                  <span className="recommend-reason">
                    (평균 {recommendedRoute.duration.average}분)
                  </span>
                </span>
              </div>
            )}

            {/* Departure Time Hint */}
            {departureHint && (
              <p className="today-departure-hint">{departureHint}</p>
            )}

            {/* Weather inline error */}
            {weatherError && !weather && (
              <p className="today-weather-error">날씨 정보를 불러오지 못했어요</p>
            )}

            {/* Start Button */}
            <button
              type="button"
              className="today-start-btn"
              onClick={handleStartCommute}
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

      {/* Other routes quick switch */}
      {hasRoutes && routes.length > 1 && (
        <section className="other-routes" aria-label="다른 경로">
          {routes.filter(r => r.id !== activeRoute?.id).slice(0, 2).map(route => (
            <button
              key={route.id}
              type="button"
              className="other-route-chip"
              onClick={() => navigate('/commute', { state: { routeId: route.id } })}
            >
              <span className="other-route-type">
                {route.routeType === 'morning' ? '출근' : '퇴근'}
              </span>
              <span>{route.name}</span>
            </button>
          ))}
        </section>
      )}

      {/* Next Alert */}
      {nextAlert && (
        <Link to="/alerts" className="next-alert-bar">
          <span className="next-alert-label">다음 알림</span>
          <span className="next-alert-time">{nextAlert.time}</span>
          <span className="next-alert-type">{nextAlert.label}</span>
        </Link>
      )}

      {/* Notification history quick link */}
      {alerts.length > 0 && (
        <Link to="/notifications" className="home-history-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>알림 발송 기록 보기</span>
          <span className="home-history-arrow">→</span>
        </Link>
      )}

      {/* Stats Summary */}
      {commuteStats && (commuteStats.overallAverageDuration > 0 || (commuteStats.recentSessions != null && commuteStats.recentSessions > 0)) && (
        <section className="home-stats" aria-label="이번 주 통근">
          <h3 className="home-stats-title">이번 주</h3>
          <div className="home-stats-row">
            <div className="home-stat">
              <span className="home-stat-value">
                {commuteStats.overallAverageDuration ? `${commuteStats.overallAverageDuration}분` : '-'}
              </span>
              <span className="home-stat-label">평균</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">
                {commuteStats.recentSessions != null ? `${commuteStats.recentSessions}회` : '-'}
              </span>
              <span className="home-stat-label">출퇴근</span>
            </div>
          </div>
          {commuteStats.insights && commuteStats.insights.length > 0 && (
            <p className="home-insight">{commuteStats.insights[0]}</p>
          )}
        </section>
      )}
    </main>
  );
}
