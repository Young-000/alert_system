import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { behaviorCollector } from '../../infrastructure/analytics/behavior-collector';

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

export function HomePage() {
  const isLoggedIn = getInitialLoginState();
  const initialDeparture = getInitialDepartureState();
  const [showDepartureButton, setShowDepartureButton] = useState(initialDeparture.showButton);
  const [departureConfirmed, setDepartureConfirmed] = useState(getInitialDepartureConfirmed);
  const [activeAlertId] = useState<string | null>(initialDeparture.alertId);
  const [searchParams, setSearchParams] = useSearchParams();
  const hasHandledUrlParam = useRef(false);

  // Initialize behavior collector (side effect for external system)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, []);

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

    // Hide confirmation after 3 seconds
    setTimeout(() => setDepartureConfirmed(false), 3000);
  }, [activeAlertId]);

  return (
    <main className="page">
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <nav className="nav">
        <div className="brand">
          <strong>Alert System</strong>
          <span>출퇴근 알림 시스템</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/alerts">
            알림 설정
          </Link>
          {isLoggedIn ? (
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
          ) : (
            <Link className="btn btn-primary" to="/login">
              시작하기
            </Link>
          )}
        </div>
      </nav>

      {/* Departure Confirmation Toast */}
      {departureConfirmed && (
        <div className="toast toast-success" role="alert" aria-live="polite">
          <span className="toast-icon">✅</span>
          <span>출발이 기록되었습니다! 오늘도 좋은 하루 되세요.</span>
        </div>
      )}

      {/* Quick Departure Button (shown after receiving notification) */}
      {showDepartureButton && isLoggedIn && (
        <div className="departure-panel">
          <div className="departure-content">
            <span className="departure-icon">🚶</span>
            <div className="departure-text">
              <strong>지금 출발하시나요?</strong>
              <span className="muted">버튼을 눌러 출발 시간을 기록하세요</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-departure"
              onClick={handleDepartureConfirm}
            >
              지금 출발
            </button>
          </div>
        </div>
      )}

      <section id="main-content" className="hero">
        <div className="hero-content">
          <p className="eyebrow">도시 리듬을 읽는 알림</p>
          <h1>출근과 퇴근 사이, 필요한 정보만 골라서</h1>
          <p className="lead">
            지하철 역 검색, 위치 기반 공기질, 강수 알림을 하루 두 번 자동으로
            받아보세요.
          </p>
          <div className="hero-actions">
            {isLoggedIn ? (
              <Link className="btn btn-primary" to="/alerts">
                내 알림 관리
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" to="/login">
                  알림 시작하기
                </Link>
                <Link className="btn btn-outline" to="/alerts">
                  데모 보기
                </Link>
              </>
            )}
          </div>
          <div className="hero-meta">
            <span className="chip">기본 스케줄 08:00 / 18:00</span>
            <span className="chip">브라우저 위치 + 수동 입력</span>
            <span className="chip">지하철 역 검색</span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="card compact">
            <div className="panel-title">오늘의 알림 샘플</div>
            <div className="panel-row">
              <strong>08:00</strong>
              <span className="muted">출근 · 강남역 · 미세먼지 보통</span>
            </div>
            <div className="panel-row">
              <strong>18:00</strong>
              <span className="muted">퇴근 · 강남역 · 우산 필요</span>
            </div>
          </div>
          <div className="card compact">
            <div className="panel-title">오늘의 흐름</div>
            <div className="panel-row">
              <span>위치 업데이트</span>
              <strong>2분 전</strong>
            </div>
            <div className="panel-row">
              <span>지하철 역</span>
              <strong>강남 · 2호선</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <div className="card feature-card">
          <span className="feature-icon" aria-hidden="true">📍</span>
          <h3>위치 기반</h3>
          <p className="muted">
            브라우저 위치 권한으로 자동 설정하고 필요하면 수동 입력도 가능해요.
          </p>
        </div>
        <div className="card feature-card">
          <span className="feature-icon" aria-hidden="true">🚇</span>
          <h3>지하철 역 검색</h3>
          <p className="muted">검색 즉시 역 목록을 보여주고 노선까지 함께 확인해요.</p>
        </div>
        <div className="card feature-card">
          <span className="feature-icon" aria-hidden="true">🔔</span>
          <h3>하루 두 번 알림</h3>
          <p className="muted">
            기본 스케줄 08:00 / 18:00. 필요하면 원하는 시간으로 조정할 수 있어요.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div className="step-badge">✨</div>
          <div>
            <h2>사용 흐름</h2>
            <p className="muted">설정은 3분이면 끝나요.</p>
          </div>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-badge">1</div>
            <strong>위치 설정</strong>
            <span className="muted">권한 허용 또는 수동 입력</span>
          </div>
          <div className="step-card">
            <div className="step-badge">2</div>
            <strong>지하철 역 선택</strong>
            <span className="muted">검색 후 노선까지 확인</span>
          </div>
          <div className="step-card">
            <div className="step-badge">3</div>
            <strong>알림 시간</strong>
            <span className="muted">08:00 / 18:00 기본 제공</span>
          </div>
          <div className="step-card">
            <div className="step-badge">4</div>
            <strong>푸시 구독</strong>
            <span className="muted">웹에서 바로 알림 수신</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">
          <span>Alert System</span>
          <span className="footer-divider">·</span>
          <span>출퇴근 알림 서비스</span>
        </p>
        <p className="footer-copyright">© 2025 All rights reserved</p>
      </footer>
    </main>
  );
}
