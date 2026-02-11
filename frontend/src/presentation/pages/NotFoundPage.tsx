import { Link } from 'react-router-dom';

export function NotFoundPage(): JSX.Element {
  return (
    <main className="page">
      <section className="error-page">
        <div className="error-content">
          <div className="error-code">404</div>
          <h1>페이지를 찾을 수 없습니다</h1>
          <p className="muted">
            요청하신 페이지가 존재하지 않거나
            <br />
            이동되었을 수 있습니다.
          </p>
          <div className="error-actions">
            <Link to="/" className="btn btn-primary">
              홈으로
            </Link>
            <Link to="/alerts" className="btn btn-outline">
              알림 설정
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
