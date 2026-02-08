import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { behaviorCollector } from '@infrastructure/analytics/behavior-collector';
import { alertApiClient, weatherApiClient, busApiClient, subwayApiClient } from '@infrastructure/api';
import type { Alert, WeatherData, BusArrival, SubwayArrival } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse, type CommuteStatsResponse } from '@infrastructure/api/commute-api.client';

function getInitialLoginState(): boolean {
  return !!localStorage.getItem('userId');
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '새벽이에요', emoji: '🌙' };
  if (hour < 9) return { text: '좋은 아침이에요', emoji: '🌅' };
  if (hour < 12) return { text: '좋은 오전이에요', emoji: '☀️' };
  if (hour < 14) return { text: '점심 시간이에요', emoji: '🍽️' };
  if (hour < 18) return { text: '좋은 오후에요', emoji: '🌤️' };
  if (hour < 21) return { text: '좋은 저녁이에요', emoji: '🌆' };
  return { text: '좋은 밤이에요', emoji: '🌙' };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny') || c === '맑음') return '☀️';
  if (c.includes('cloud') || c === '구름많음') return '☁️';
  if (c.includes('overcast') || c === '흐림') return '🌥️';
  if (c.includes('rain') || c === '비') return '🌧️';
  if (c.includes('snow') || c === '눈') return '❄️';
  if (c.includes('thunder') || c === '뇌우') return '⛈️';
  return '🌤️';
}

function getAqiStatus(pm10: number | undefined): { label: string; color: string } {
  if (pm10 == null) return { label: '-', color: 'var(--text-muted)' };
  if (pm10 <= 30) return { label: '좋음', color: 'var(--success)' };
  if (pm10 <= 80) return { label: '보통', color: 'var(--warning)' };
  if (pm10 <= 150) return { label: '나쁨', color: 'var(--error)' };
  return { label: '매우나쁨', color: 'var(--error)' };
}

interface TransitInfo {
  type: 'bus' | 'subway';
  name: string;
  arrivals: (BusArrival | SubwayArrival)[];
  isLoading: boolean;
}

export function HomePage() {
  const navigate = useNavigate();
  const isLoggedIn = getInitialLoginState();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [commuteStats, setCommuteStats] = useState<CommuteStatsResponse | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [transitInfos, setTransitInfos] = useState<TransitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userId = localStorage.getItem('userId') || '';
  const greeting = getGreeting();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // Load core dashboard data
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const commuteApiClient = getCommuteApiClient();
        const [alertsData, routesData, statsData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch(() => []),
          commuteApiClient.getUserRoutes(userId).catch(() => []),
          commuteApiClient.getStats(userId, 7).catch(() => null),
        ]);
        if (!isMounted) return;
        setAlerts(alertsData);
        setRoutes(routesData);
        setCommuteStats(statsData);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userId]);

  // Load weather data (non-blocking, loads after main data)
  useEffect(() => {
    let isMounted = true;

    if (!userId) return;

    const loadWeather = async (): Promise<void> => {
      try {
        // Default to Seoul center if no location
        const lat = 37.5665;
        const lng = 126.978;
        const data = await weatherApiClient.getCurrentWeather(lat, lng);
        if (isMounted) setWeather(data);
      } catch {
        // Weather failure is non-critical
      }
    };

    loadWeather();
    return () => { isMounted = false; };
  }, [userId]);

  // Load transit arrivals from user's route checkpoints
  const loadTransitArrivals = useCallback(async (userRoutes: RouteResponse[]): Promise<void> => {
    if (userRoutes.length === 0) return;

    // Extract unique transit stops from routes
    const subwayStations = new Set<string>();
    const busStopIds = new Set<string>();

    for (const route of userRoutes) {
      for (const cp of route.checkpoints) {
        if (cp.transportMode === 'subway' && cp.name) {
          // Remove line info from name (e.g., "강남역 2호선" -> "강남")
          const stationName = cp.name.replace(/역$/, '').replace(/\s*\d+호선.*$/, '');
          subwayStations.add(stationName);
        }
        if (cp.transportMode === 'bus' && cp.linkedBusStopId) {
          busStopIds.add(cp.linkedBusStopId);
        }
      }
    }

    const infos: TransitInfo[] = [];

    // Fetch subway arrivals (max 2 stations)
    const stationNames = Array.from(subwayStations).slice(0, 2);
    for (const name of stationNames) {
      infos.push({ type: 'subway', name: `${name}역`, arrivals: [], isLoading: true });
    }

    // Fetch bus arrivals (max 2 stops)
    const stopIds = Array.from(busStopIds).slice(0, 2);
    for (const id of stopIds) {
      infos.push({ type: 'bus', name: `정류장 ${id}`, arrivals: [], isLoading: true });
    }

    setTransitInfos([...infos]);

    // Parallel fetch
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

  // Trigger transit loading when routes are available
  useEffect(() => {
    if (routes.length > 0) {
      loadTransitArrivals(routes);
    }
  }, [routes, loadTransitArrivals]);

  // Next alert calculation
  const nextAlert = useMemo((): { time: string; type: string } | null => {
    const enabledAlerts = alerts.filter(a => a.enabled);
    if (enabledAlerts.length === 0) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    interface AlertTime { hour: number; minute: number; type: string }
    const todayAlerts: AlertTime[] = [];
    let earliestTomorrow: AlertTime | null = null;

    for (const alert of enabledAlerts) {
      const parts = alert.schedule.split(' ');
      if (parts.length >= 2) {
        const cronMinute = isNaN(Number(parts[0])) ? 0 : Number(parts[0]);
        const hours = parts[1].includes(',')
          ? parts[1].split(',').map(Number).filter(h => !isNaN(h))
          : [Number(parts[1])].filter(h => !isNaN(h));

        const alertType = alert.alertTypes.includes('weather') ? '날씨' : '교통';

        for (const hour of hours) {
          if (hour > currentHour || (hour === currentHour && cronMinute > currentMinute)) {
            todayAlerts.push({ hour, minute: cronMinute, type: alertType });
          }
          if (!earliestTomorrow || hour < earliestTomorrow.hour ||
              (hour === earliestTomorrow.hour && cronMinute < earliestTomorrow.minute)) {
            earliestTomorrow = { hour, minute: cronMinute, type: alertType };
          }
        }
      }
    }

    if (todayAlerts.length > 0) {
      todayAlerts.sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute);
      const next = todayAlerts[0];
      return {
        time: `${String(next.hour).padStart(2, '0')}:${String(next.minute).padStart(2, '0')}`,
        type: next.type,
      };
    }

    if (earliestTomorrow) {
      return {
        time: `내일 ${String(earliestTomorrow.hour).padStart(2, '0')}:${String(earliestTomorrow.minute).padStart(2, '0')}`,
        type: earliestTomorrow.type,
      };
    }

    return null;
  }, [alerts]);

  // Air quality from weather data (mock - will be enhanced)
  const airQuality = useMemo(() => {
    // In the future, this will come from the air quality API
    return getAqiStatus(undefined);
  }, []);

  // Guest landing page (unchanged)
  if (!isLoggedIn) {
    return (
      <main className="page">
        <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
        <nav className="nav">
          <div className="brand">
            <strong>출퇴근 메이트</strong>
            <span>나의 출퇴근 동반자</span>
          </div>
          <div className="nav-actions">
            <Link className="btn btn-primary" to="/login">시작하기</Link>
          </div>
        </nav>

        <section id="main-content" className="guest-hero">
          <div className="guest-hero-content">
            <p className="eyebrow">출퇴근의 모든 순간을 함께</p>
            <h1>출근 전, 출퇴근 중, 퇴근 후까지</h1>
            <p className="lead">
              날씨·교통 알림부터 이동 시간 추적, 통근 패턴 분석까지.
              <br />
              매일의 출퇴근을 더 스마트하게.
            </p>
            <div className="guest-hero-actions">
              <Link className="btn btn-primary btn-lg" to="/login">무료로 시작하기</Link>
              <Link className="btn btn-outline btn-lg" to="/alerts">기능 미리보기</Link>
            </div>
          </div>

          <div className="guest-features">
            <div className="guest-feature-card">
              <span className="guest-feature-icon">🌅</span>
              <h3>출근 전</h3>
              <p>날씨, 미세먼지, 교통 알림을 카카오톡으로 받아보세요</p>
            </div>
            <div className="guest-feature-card">
              <span className="guest-feature-icon">🚶</span>
              <h3>출퇴근 중</h3>
              <p>실제 이동 시간을 기록하고 구간별로 분석하세요</p>
            </div>
            <div className="guest-feature-card">
              <span className="guest-feature-icon">📊</span>
              <h3>퇴근 후</h3>
              <p>일주일, 한 달간의 통근 패턴을 확인하세요</p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <p className="footer-text">
            <span>출퇴근 메이트</span>
            <span className="footer-divider">·</span>
            <span>나의 출퇴근 동반자</span>
          </p>
          <p className="footer-copyright">© 2025 All rights reserved</p>
        </footer>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="page">
        <nav className="nav">
          <div className="brand">
            <strong>출퇴근 메이트</strong>
            <span>나의 출퇴근 동반자</span>
          </div>
          <div className="nav-actions">
            <div className="skeleton skeleton-btn" />
          </div>
        </nav>
        <div className="dashboard-loading">
          <span className="spinner" />
          <p>대시보드 로딩 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
      <nav className="nav">
        <div className="brand">
          <strong>출퇴근 메이트</strong>
          <span>나의 출퇴근 동반자</span>
        </div>
        <div className="nav-actions">
          <Link
            className="btn btn-ghost nav-settings-btn"
            to="/settings"
            title="내 설정"
            aria-label="내 설정"
          >
            ⚙️
          </Link>
        </div>
      </nav>

      {/* Dashboard Header with Weather */}
      <header id="main-content" className="dashboard-header">
        <div className="dashboard-greeting">
          <span className="greeting-emoji">{greeting.emoji}</span>
          <div className="greeting-text">
            <h1>{greeting.text}</h1>
            <p className="current-time">{formatTime(currentTime)}</p>
          </div>
        </div>
      </header>

      {/* Quick Actions: Alerts + Commute Start - 최상단 배치 */}
      <div className="home-actions-grid">
        {/* Alerts Section */}
        <section className="home-action-card">
          <h2 className="section-title">알림</h2>
          {nextAlert ? (
            <div className="next-alert-compact">
              <div className="next-alert-highlight">
                <span className="alert-time">{nextAlert.time}</span>
                <span className="alert-type">{nextAlert.type} 알림</span>
              </div>
              <div className="alerts-mini-list">
                {alerts.filter(a => a.enabled).slice(0, 2).map((alert) => (
                  <div key={alert.id} className="alert-mini-item">
                    <span>{alert.alertTypes.includes('weather') ? '🌤️' : '🚇'}</span>
                    <span>{alert.name}</span>
                  </div>
                ))}
              </div>
              <Link to="/alerts" className="btn btn-outline btn-sm">알림 관리 →</Link>
            </div>
          ) : (
            <div className="phase-empty">
              <p>알림을 설정하면 출근 전에 정보를 받아볼 수 있어요</p>
              <Link to="/alerts" className="btn btn-primary btn-sm">🔔 알림 설정하기</Link>
            </div>
          )}
        </section>

        {/* Quick Commute Start */}
        <section className="home-action-card">
          <h2 className="section-title">출퇴근 기록</h2>
          {routes.length > 0 ? (
            <div className="routes-quick-list">
              {routes.slice(0, 2).map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className="route-quick-btn"
                  onClick={() => navigate('/commute', { state: { routeId: route.id } })}
                >
                  <span className="route-quick-icon">
                    {route.routeType === 'morning' ? '🏢' : '🏠'}
                  </span>
                  <span className="route-quick-name">{route.name}</span>
                  <span className="route-quick-time">
                    {(route.totalExpectedDuration ?? 0) > 0 ? `${route.totalExpectedDuration}분` : '측정 전'}
                  </span>
                  <span className="route-quick-arrow">▶</span>
                </button>
              ))}
              <button
                type="button"
                className="route-quick-btn route-stopwatch"
                onClick={() => navigate('/commute?mode=stopwatch')}
              >
                <span className="route-quick-icon">⏱️</span>
                <span className="route-quick-name">스톱워치</span>
                <span className="route-quick-time">간편 기록</span>
                <span className="route-quick-arrow">▶</span>
              </button>
            </div>
          ) : (
            <div className="phase-empty">
              <p>경로를 등록하거나 스톱워치로 바로 기록하세요</p>
              <div className="phase-actions-row">
                <Link to="/routes" className="btn btn-outline btn-sm">경로 등록</Link>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/commute?mode=stopwatch')}
                >
                  ⏱️ 바로 시작
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Weather + Air Quality Card */}
      {weather && (
        <section className="weather-card" aria-label="현재 날씨">
          <div className="weather-main">
            <span className="weather-icon">{getWeatherEmoji(weather.condition)}</span>
            <div className="weather-temp">
              <span className="temp-value">{Math.round(weather.temperature)}°</span>
              <span className="temp-condition">{weather.conditionKr || weather.condition}</span>
            </div>
            <div className="weather-details">
              <span className="weather-detail">
                💧 {weather.humidity}%
              </span>
              <span className="weather-detail">
                💨 {weather.windSpeed}m/s
              </span>
              <span className="weather-detail" style={{ color: airQuality.color }}>
                🌫️ {airQuality.label}
              </span>
            </div>
          </div>
          {weather.forecast && weather.forecast.hourlyForecasts.length > 0 && (
            <div className="weather-forecast">
              {weather.forecast.hourlyForecasts.slice(0, 5).map((h, i) => (
                <div key={i} className="forecast-hour">
                  <span className="forecast-time">{h.time}</span>
                  <span className="forecast-icon">{getWeatherEmoji(h.condition)}</span>
                  <span className="forecast-temp">{h.temperature}°</span>
                  {h.rainProbability > 0 && (
                    <span className="forecast-rain">{h.rainProbability}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Real-time Transit Arrivals */}
      {transitInfos.length > 0 && (
        <section className="transit-card" aria-label="실시간 도착정보">
          <h2 className="section-title">실시간 도착정보</h2>
          <div className="transit-list">
            {transitInfos.map((info, idx) => (
              <div key={idx} className="transit-station">
                <div className="transit-station-header">
                  <span className="transit-type-badge" data-type={info.type}>
                    {info.type === 'subway' ? '🚇' : '🚌'}
                  </span>
                  <span className="transit-station-name">{info.name}</span>
                </div>
                {info.isLoading ? (
                  <div className="transit-loading">
                    <span className="spinner spinner-sm" />
                  </div>
                ) : info.arrivals.length === 0 ? (
                  <p className="transit-empty muted">도착 정보 없음</p>
                ) : (
                  <div className="transit-arrivals">
                    {info.arrivals.map((arrival, aIdx) => (
                      <div key={aIdx} className="transit-arrival-row">
                        {'routeName' in arrival ? (
                          <>
                            <span className="arrival-route">{arrival.routeName}</span>
                            <span className="arrival-time">
                              {arrival.arrivalTime > 0 ? `${arrival.arrivalTime}분` : '곧 도착'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="arrival-route">{arrival.direction}</span>
                            <span className="arrival-dest muted">{arrival.destination}행</span>
                            <span className="arrival-time">
                              {arrival.arrivalTime > 0 ? `${arrival.arrivalTime}분` : '곧 도착'}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats Preview */}
      <section className="home-stats-card">
        <h2 className="section-title">이번 주 통근</h2>
        <div className="stats-preview">
          <div className="stat-mini">
            <span className="stat-mini-value">
              {commuteStats?.overallAverageDuration
                ? `${commuteStats.overallAverageDuration}분`
                : '-'}
            </span>
            <span className="stat-mini-label">평균 시간</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">
              {commuteStats?.recentSessions != null
                ? `${commuteStats.recentSessions}회`
                : '-'}
            </span>
            <span className="stat-mini-label">이번 주</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini-value">
              {commuteStats?.overallAverageWaitTime
                ? `${commuteStats.overallAverageWaitTime}분`
                : '-'}
            </span>
            <span className="stat-mini-label">평균 대기</span>
          </div>
        </div>
        {commuteStats?.insights && commuteStats.insights.length > 0 && (
          <div className="stats-insight">
            <span className="insight-icon">💡</span>
            <span className="insight-text">{commuteStats.insights[0]}</span>
          </div>
        )}
        <Link to="/commute/dashboard" className="btn btn-outline btn-sm">
          통계 상세 보기 →
        </Link>
      </section>

      <footer className="footer home-footer">
        <p className="footer-text">
          <span>출퇴근 메이트</span>
          <span className="footer-divider">·</span>
          <span>나의 출퇴근 동반자</span>
        </p>
        <p className="footer-copyright">© 2025 All rights reserved</p>
      </footer>
    </main>
  );
}
