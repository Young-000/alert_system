import { Link } from 'react-router-dom';

interface RoutesTabProps {
  routeCount: number;
}

export function RoutesTab({ routeCount }: RoutesTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-routes" aria-labelledby="tab-routes">
      <section className="settings-section">
        <h2 className="section-title">경로 관리</h2>
        <p className="section-description">
          출퇴근 경로를 추가하고 관리하세요.
        </p>

        {routeCount === 0 ? (
          <div className="settings-empty-section">
            <span className="empty-icon-svg" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <p>등록된 경로가 없어요</p>
            <Link to="/routes" className="btn btn-primary btn-sm">경로 추가하기</Link>
          </div>
        ) : (
          <div className="settings-shortcut">
            <div className="shortcut-info">
              <span className="shortcut-count">{routeCount}개</span>
              <span className="shortcut-label">등록된 경로</span>
            </div>
            <Link to="/routes" className="btn btn-primary">
              경로 관리 바로가기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
