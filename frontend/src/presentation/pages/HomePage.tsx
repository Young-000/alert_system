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
          <strong>출퇴근 메이트</strong>
          <span>나의 출퇴근 동반자</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/alerts">
            출근 전
          </Link>
          <Link className="btn btn-ghost" to="/commute">
            출퇴근 중
          </Link>
          <Link className="btn btn-ghost" to="/commute/dashboard">
            퇴근 후
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
          <p className="eyebrow">출퇴근의 모든 순간을 함께</p>
          <h1>출근 전, 출퇴근 중, 퇴근 후까지</h1>
          <p className="lead">
            날씨·교통 알림부터 이동 시간 추적, 통근 패턴 분석까지.
            <br />
            매일의 출퇴근을 더 스마트하게.
          </p>
          <div className="hero-actions">
            {isLoggedIn ? (
              <>
                <Link className="btn btn-primary" to="/alerts">
                  오늘 알림 확인
                </Link>
                <Link className="btn btn-outline" to="/commute">
                  트래킹 시작
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/login">
                  시작하기
                </Link>
                <Link className="btn btn-outline" to="/alerts">
                  미리보기
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-panel">
          <div className="card compact">
            <div className="panel-title">오늘의 출퇴근</div>
            <div className="panel-row">
              <strong>07:30</strong>
              <span className="muted">알림 받음 · 우산 챙기세요</span>
            </div>
            <div className="panel-row">
              <strong>08:15</strong>
              <span className="muted">출발 · 트래킹 시작</span>
            </div>
            <div className="panel-row">
              <strong>09:02</strong>
              <span className="muted">도착 · 47분 소요</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="grid-3 pillars-section">
        <Link to="/alerts" className="card feature-card pillar-card">
          <div className="pillar-number">1</div>
          <span className="feature-icon" aria-hidden="true">🌅</span>
          <h3>출근 전</h3>
          <p className="pillar-subtitle">알림 준비</p>
          <p className="muted">
            날씨, 미세먼지, 교통 정보를 출근 전에 미리 받아보세요.
            우산이 필요한지, 마스크를 챙겨야 하는지 알려드려요.
          </p>
          <span className="pillar-action">알림 설정하기 →</span>
        </Link>
        <Link to="/commute" className="card feature-card pillar-card pillar-highlight">
          <div className="pillar-number">2</div>
          <span className="feature-icon" aria-hidden="true">🚶</span>
          <h3>출퇴근 중</h3>
          <p className="pillar-subtitle">시간 추적</p>
          <p className="muted">
            출발부터 도착까지 실제 이동 시간을 기록하세요.
            체크포인트별로 어디서 시간이 걸리는지 파악할 수 있어요.
          </p>
          <span className="pillar-action">트래킹 시작하기 →</span>
        </Link>
        <Link to="/commute/dashboard" className="card feature-card pillar-card">
          <div className="pillar-number">3</div>
          <span className="feature-icon" aria-hidden="true">📊</span>
          <h3>퇴근 후</h3>
          <p className="pillar-subtitle">기록 리뷰</p>
          <p className="muted">
            일주일, 한 달간의 통근 패턴을 분석하세요.
            평균 소요 시간과 최적 출발 시간을 추천받을 수 있어요.
          </p>
          <span className="pillar-action">통계 보기 →</span>
        </Link>
      </section>

      {/* How it works */}
      <section className="card how-it-works">
        <div className="section-head">
          <div className="step-badge">✨</div>
          <div>
            <h2>이렇게 사용하세요</h2>
            <p className="muted">하루 3분, 출퇴근이 달라져요</p>
          </div>
        </div>
        <div className="journey-flow">
          <div className="journey-step">
            <div className="journey-time">AM 7:30</div>
            <div className="journey-icon">📱</div>
            <div className="journey-content">
              <strong>알림 확인</strong>
              <span className="muted">날씨·교통 정보 수신</span>
            </div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="journey-time">AM 8:00</div>
            <div className="journey-icon">🚶</div>
            <div className="journey-content">
              <strong>출발 버튼</strong>
              <span className="muted">트래킹 자동 시작</span>
            </div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="journey-time">AM 9:00</div>
            <div className="journey-icon">🏢</div>
            <div className="journey-content">
              <strong>도착 체크</strong>
              <span className="muted">소요 시간 기록</span>
            </div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="journey-time">PM 7:00</div>
            <div className="journey-icon">📊</div>
            <div className="journey-content">
              <strong>하루 리뷰</strong>
              <span className="muted">패턴 분석</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="card features-detail">
        <h2>주요 기능</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon-small">🌤️</span>
            <div>
              <strong>날씨 알림</strong>
              <p className="muted">비, 눈, 미세먼지 정보</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon-small">🚇</span>
            <div>
              <strong>지하철 도착</strong>
              <p className="muted">실시간 도착 정보</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon-small">⏱️</span>
            <div>
              <strong>시간 추적</strong>
              <p className="muted">구간별 소요 시간</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon-small">📈</span>
            <div>
              <strong>패턴 분석</strong>
              <p className="muted">최적 출발 시간 추천</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon-small">💬</span>
            <div>
              <strong>카카오 알림톡</strong>
              <p className="muted">앱 설치 없이 알림</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon-small">🗺️</span>
            <div>
              <strong>경로 설정</strong>
              <p className="muted">나만의 출퇴근 경로</p>
            </div>
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
