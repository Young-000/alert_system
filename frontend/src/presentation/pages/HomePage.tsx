import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { behaviorCollector } from '../../infrastructure/analytics/behavior-collector';
import { alertApiClient } from '../../infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '../../infrastructure/api/commute-api.client';
import type { Alert } from '../../infrastructure/api';

// Compute initial states outside of effects to avoid cascading renders
function getInitialLoginState(): boolean {
  return !!localStorage.getItem('userId');
}

function getInitialDepartureState(): { showButton: boolean; alertId: string | null } {
  const lastNotificationTime = localStorage.getItem('lastNotificationTime');
  const lastAlertId = localStorage.getItem('lastAlertId');
  if (lastNotificationTime && lastAlertId) {
    const timeDiff = Date.now() - parseInt(lastNotificationTime, 10);
    if (timeDiff < 30 * 60 * 1000) { // 30 minutes
      return { showButton: true, alertId: lastAlertId };
    }
  }
  return { showButton: false, alertId: null };
}

// Check initial URL params for departure confirmation
function getInitialDepartureConfirmed(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('departure') === 'confirmed';
}

// Get greeting based on time of day
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

// Format time for display
function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function HomePage() {
  const navigate = useNavigate();
  const isLoggedIn = getInitialLoginState();
  const initialDeparture = getInitialDepartureState();
  const [showDepartureButton, setShowDepartureButton] = useState(initialDeparture.showButton);
  const [departureConfirmed, setDepartureConfirmed] = useState(getInitialDepartureConfirmed);
  const [activeAlertId] = useState<string | null>(initialDeparture.alertId);
  const [searchParams, setSearchParams] = useSearchParams();
  const hasHandledUrlParam = useRef(false);

  // Dashboard data states
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userId = localStorage.getItem('userId') || '';
  const greeting = getGreeting();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Initialize behavior collector (side effect for external system)
  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // Load dashboard data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const commuteApiClient = getCommuteApiClient();
        const [alertsData, routesData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch(() => []),
          commuteApiClient.getUserRoutes(userId).catch(() => []),
        ]);
        setAlerts(alertsData);
        setRoutes(routesData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Clean up URL params and auto-hide confirmation (side effects for external system)
  useEffect(() => {
    if (searchParams.get('departure') === 'confirmed' && !hasHandledUrlParam.current) {
      hasHandledUrlParam.current = true;
      // Clear the query param (external system: browser URL)
      searchParams.delete('departure');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-hide departure confirmation toast after 3 seconds
  useEffect(() => {
    if (departureConfirmed) {
      const timer = setTimeout(() => setDepartureConfirmed(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [departureConfirmed]);

  const handleDepartureConfirm = useCallback(async () => {
    if (!activeAlertId) return;

    await behaviorCollector.trackDepartureConfirmed({
      alertId: activeAlertId,
      source: 'app',
    });

    setDepartureConfirmed(true);
    setShowDepartureButton(false);
    localStorage.removeItem('lastNotificationTime');
    localStorage.removeItem('lastAlertId');
    // Note: setTimeout for hiding confirmation is handled by useEffect above
  }, [activeAlertId]);

  // Get next alert time - memoized to avoid recalculation on every render
  const nextAlert = useMemo((): { time: string; type: string } | null => {
    const enabledAlerts = alerts.filter(a => a.enabled);
    if (enabledAlerts.length === 0) return null;

    // Parse cron schedules to find next alert
    const now = new Date();
    const currentHour = now.getHours();

    for (const alert of enabledAlerts) {
      const parts = alert.schedule.split(' ');
      if (parts.length >= 2) {
        const hourStr = parts[1];
        // Handle both single hour "7" and multiple hours "7,18"
        const hours = hourStr.includes(',')
          ? hourStr.split(',').map(Number).filter(h => !isNaN(h))
          : [Number(hourStr)].filter(h => !isNaN(h));

        for (const hour of hours) {
          if (hour > currentHour) {
            return {
              time: `${String(hour).padStart(2, '0')}:00`,
              type: alert.alertTypes.includes('weather') ? '날씨' : '교통',
            };
          }
        }
      }
    }

    // Return first alert of tomorrow
    const firstAlert = enabledAlerts[0];
    const parts = firstAlert.schedule.split(' ');
    if (parts.length >= 2) {
      const hourStr = parts[1];
      const hour = hourStr.includes(',') ? hourStr.split(',')[0] : hourStr;
      if (!isNaN(Number(hour))) {
        return {
          time: `내일 ${hour.padStart(2, '0')}:00`,
          type: firstAlert.alertTypes.includes('weather') ? '날씨' : '교통',
        };
      }
    }

    return null;
  }, [alerts]);

  // Guest landing page
  if (!isLoggedIn) {
    return (
      <main className="page">
        <a href="#main-content" className="skip-link">
          본문으로 건너뛰기
        </a>
        <nav className="nav">
          <div className="brand">
            <strong>출퇴근 메이트</strong>
            <span>나의 출퇴근 동반자</span>
          </div>
          <div className="nav-actions">
            <Link className="btn btn-primary" to="/login">
              시작하기
            </Link>
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
              <Link className="btn btn-primary btn-lg" to="/login">
                무료로 시작하기
              </Link>
              <Link className="btn btn-outline btn-lg" to="/alerts">
                기능 미리보기
              </Link>
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

  // Loading state
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

  // Logged-in dashboard
  return (
    <main className="page">
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <nav className="nav">
        <div className="brand">
          <strong>출퇴근 메이트</strong>
          <span>나의 출퇴근 동반자</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/commute">
            트래킹
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('accessToken');
              window.location.reload();
            }}
          >
            로그아웃
          </button>
        </div>
      </nav>

      {/* Departure Confirmation Toast */}
      {departureConfirmed && (
        <div className="toast toast-success" role="alert" aria-live="polite">
          <span className="toast-icon">✅</span>
          <span>출발이 기록되었습니다! 오늘도 좋은 하루 되세요.</span>
        </div>
      )}

      {/* Dashboard Header */}
      <header id="main-content" className="dashboard-header">
        <div className="dashboard-greeting">
          <span className="greeting-emoji">{greeting.emoji}</span>
          <div className="greeting-text">
            <h1>{greeting.text}</h1>
            <p className="current-time">{formatTime(currentTime)}</p>
          </div>
        </div>
      </header>

      {/* Quick Departure Button (shown after receiving notification) */}
      {showDepartureButton && (
        <div className="departure-banner">
          <div className="departure-content">
            <span className="departure-icon">🚶</span>
            <div className="departure-text">
              <strong>지금 출발하시나요?</strong>
              <span className="muted">버튼을 눌러 출발 시간을 기록하세요</span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDepartureConfirm}
            >
              지금 출발
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Quick Action Card */}
        <div className="dashboard-card dashboard-card-action">
          <div className="card-header">
            <span className="card-icon">🚀</span>
            <h2>빠른 액션</h2>
          </div>
          <div className="quick-actions">
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => navigate('/commute')}
            >
              <span className="quick-action-icon">⏱️</span>
              <span>트래킹 시작</span>
            </button>
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => navigate('/alerts')}
            >
              <span className="quick-action-icon">🔔</span>
              <span>알림 설정</span>
            </button>
          </div>
        </div>

        {/* Next Alert Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🔔</span>
            <h2>다음 알림</h2>
          </div>
          {nextAlert ? (
            <div className="next-alert-content">
              <div className="next-alert-time">{nextAlert.time}</div>
              <div className="next-alert-type">{nextAlert.type} 알림</div>
            </div>
          ) : (
            <div className="empty-state-mini">
              <p>설정된 알림이 없어요</p>
              <Link to="/alerts" className="btn btn-ghost btn-sm">
                알림 추가
              </Link>
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h2>이번 주 통계</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">-</span>
              <span className="stat-label">평균 소요</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">-</span>
              <span className="stat-label">출퇴근 횟수</span>
            </div>
          </div>
          <Link to="/commute/dashboard" className="btn btn-ghost btn-sm card-link">
            자세히 보기 →
          </Link>
        </div>

        {/* Alerts Summary Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <h2>알림 설정</h2>
            <Link to="/alerts" className="btn btn-ghost btn-sm">
              관리
            </Link>
          </div>
          {alerts.length > 0 ? (
            <div className="alerts-summary">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className={`alert-summary-item ${!alert.enabled ? 'disabled' : ''}`}>
                  <span className="alert-summary-icon">
                    {alert.alertTypes.includes('weather') ? '🌤️' : '🚇'}
                  </span>
                  <span className="alert-summary-name">{alert.name}</span>
                  <span className={`alert-summary-status ${alert.enabled ? 'active' : ''}`}>
                    {alert.enabled ? '활성' : '비활성'}
                  </span>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="alerts-more">+{alerts.length - 3}개 더</p>
              )}
            </div>
          ) : (
            <div className="empty-state-mini">
              <p>설정된 알림이 없어요</p>
              <Link to="/alerts" className="btn btn-primary btn-sm">
                알림 설정하기
              </Link>
            </div>
          )}
        </div>

        {/* Routes Card - Full Width */}
        <div className="dashboard-card dashboard-card-full">
          <div className="card-header">
            <span className="card-icon">📍</span>
            <h2>내 경로</h2>
            <Link to="/routes" className="btn btn-ghost btn-sm">
              + 추가
            </Link>
          </div>
          {routes.length > 0 ? (
            <div className="routes-list">
              {routes.map((route) => (
                <div key={route.id} className="route-item">
                  <div className="route-info">
                    <span className="route-icon">
                      {route.routeType === 'morning' ? '🏢' : route.routeType === 'evening' ? '🏠' : '📍'}
                    </span>
                    <div className="route-details">
                      <strong>{route.name}</strong>
                      <span className="muted">
                        {route.totalExpectedDuration ? `약 ${route.totalExpectedDuration}분` : '시간 미측정'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/commute', { state: { routeId: route.id } })}
                  >
                    시작
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-mini">
              <p>등록된 경로가 없어요</p>
              <p className="muted">출퇴근 경로를 등록하면 더 정확한 분석이 가능해요</p>
              <Link to="/routes" className="btn btn-primary btn-sm">
                경로 등록하기
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links Card */}
        <div className="dashboard-card dashboard-card-full">
          <div className="card-header">
            <span className="card-icon">🔗</span>
            <h2>바로가기</h2>
          </div>
          <div className="quick-links">
            <Link to="/alerts" className="quick-link">
              <span className="quick-link-icon">🌅</span>
              <div className="quick-link-text">
                <strong>출근 전</strong>
                <span>알림 설정</span>
              </div>
            </Link>
            <Link to="/commute" className="quick-link">
              <span className="quick-link-icon">🚶</span>
              <div className="quick-link-text">
                <strong>출퇴근 중</strong>
                <span>시간 추적</span>
              </div>
            </Link>
            <Link to="/commute/dashboard" className="quick-link">
              <span className="quick-link-icon">📊</span>
              <div className="quick-link-text">
                <strong>퇴근 후</strong>
                <span>기록 리뷰</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

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
