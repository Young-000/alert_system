import { Link } from 'react-router-dom';

export function GuestLanding(): JSX.Element {
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
          <h2>경로 등록</h2>
          <p>출근 경로를 한 번만 등록하세요</p>
        </div>
        <div className="guest-feature-card">
          <div className="guest-feature-num">2</div>
          <h2>자동 알림</h2>
          <p>날씨 + 도착정보가 알아서 옵니다</p>
        </div>
        <div className="guest-feature-card">
          <div className="guest-feature-num">3</div>
          <h2>기록 & 분석</h2>
          <p>출발/도착만 누르면 패턴이 쌓여요</p>
        </div>
      </section>

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트</p>
      </footer>
    </main>
  );
}
