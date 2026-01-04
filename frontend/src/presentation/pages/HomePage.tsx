import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <strong>Alert System</strong>
          <span>Daily commute signal</span>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/alerts">
            알림 설정
          </Link>
          <Link className="btn btn-primary" to="/login">
            시작하기
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">도시 리듬을 읽는 알림</p>
          <h1>출근과 퇴근 사이, 필요한 정보만 골라서</h1>
          <p className="lead">
            지하철 역 검색, 위치 기반 공기질, 강수 알림을 하루 두 번 자동으로
            받아보세요.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/login">
              알림 시작하기
            </Link>
            <Link className="btn btn-outline" to="/alerts">
              데모 보기
            </Link>
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
          <h3>위치 기반</h3>
          <p className="muted">
            브라우저 위치 권한으로 자동 설정하고 필요하면 수동 입력도 가능해요.
          </p>
        </div>
        <div className="card feature-card">
          <h3>지하철 역 검색</h3>
          <p className="muted">검색 즉시 역 목록을 보여주고 노선까지 함께 확인해요.</p>
        </div>
        <div className="card feature-card">
          <h3>하루 두 번 알림</h3>
          <p className="muted">
            기본 스케줄 08:00 / 18:00. 필요하면 원하는 시간으로 조정할 수 있어요.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div className="step-badge">MVP</div>
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
    </main>
  );
}
