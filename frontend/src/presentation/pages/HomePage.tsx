import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { behaviorCollector } from '@infrastructure/analytics/behavior-collector';
import { alertApiClient, weatherApiClient, airQualityApiClient, busApiClient, subwayApiClient } from '@infrastructure/api';
import type { Alert, WeatherData, AirQualityData, BusArrival, SubwayArrival } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse, type CommuteStatsResponse } from '@infrastructure/api/commute-api.client';

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
  const [isCommuteStarting, setIsCommuteStarting] = useState(false);
  const [forceRouteType, setForceRouteType] = useState<'auto' | 'morning' | 'evening'>('auto');

  const userId = localStorage.getItem('userId') || '';
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // Load core data
  useEffect(() => {
    let isMounted = true;
    if (!userId) { setIsLoading(false); return; }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const commuteApi = getCommuteApiClient();
        const [alertsData, routesData, statsData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch(() => []),
          commuteApi.getUserRoutes(userId).catch(() => []),
          commuteApi.getStats(userId, 7).catch(() => null),
        ]);
        if (!isMounted) return;
        setAlerts(alertsData);
        setRoutes(routesData);
        setCommuteStats(statsData);
      } catch {
        // Non-critical
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userId]);

  // Load weather + air quality
  useEffect(() => {
    let isMounted = true;
    if (!userId) return;

    const lat = 37.5665;
    const lng = 126.978;

    weatherApiClient.getCurrentWeather(lat, lng)
      .then(data => { if (isMounted) setWeather(data); })
      .catch(() => {});

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
    try {
      const commuteApi = getCommuteApiClient();
      const session = await commuteApi.startSession({
        userId,
        routeId: activeRoute.id,
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

  return (
    <main className="page home-page">
      <a href="#today-card" className="skip-link">본문으로 건너뛰기</a>

      {/* Header */}
      <header className="home-header">
        <div>
          <h1 className="home-greeting">{getGreeting()}</h1>
          {userName && <p className="home-user-name">{userName}님</p>}
        </div>
        {weather && (
          <div className="home-weather-badge" aria-label={`현재 날씨 ${weather.conditionKr || weather.condition} ${Math.round(weather.temperature)}도`}>
            <span aria-hidden="true">{getWeatherIcon(weather.condition)}</span>
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
                {(() => {
                  const names = activeRoute.checkpoints.map(cp => cp.name).filter(Boolean);
                  if (names.length <= 3) return names.join(' → ');
                  return `${names[0]} → (${names.length - 2}곳 경유) → ${names[names.length - 1]}`;
                })()}
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

      {/* Alert Section - always visible */}
      <section className="home-alert-section" aria-label="알림">
        {nextAlert ? (
          <Link to="/alerts" className="next-alert-bar">
            <span className="next-alert-label">다음 알림</span>
            <span className="next-alert-time">{nextAlert.time}</span>
            <span className="next-alert-type">{nextAlert.label}</span>
          </Link>
        ) : (
          <Link to="/alerts" className="home-alert-cta">
            <span className="home-alert-cta-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <span className="home-alert-cta-text">
              알림을 설정하면 출발 전 날씨와 교통 정보를 알려드려요
            </span>
            <span className="home-alert-cta-arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </Link>
        )}
      </section>

      {/* Stats Section - always visible */}
      <section className="home-stats" aria-label="이번 주 통근">
        <h3 className="home-stats-title">이번 주</h3>
        {commuteStats && (commuteStats.overallAverageDuration > 0 || (commuteStats.recentSessions != null && commuteStats.recentSessions > 0)) ? (
          <>
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
            <Link to="/commute/dashboard" className="home-stats-link">자세히 보기</Link>
          </>
        ) : (
          <div className="home-stats-empty">
            <p>출퇴근 기록을 시작하면 통계를 볼 수 있어요</p>
            <Link to="/commute/dashboard" className="home-stats-link">대시보드 보기</Link>
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
    </main>
  );
}
