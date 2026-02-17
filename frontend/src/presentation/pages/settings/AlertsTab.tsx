import { Link } from 'react-router-dom';

interface AlertsTabProps {
  alertCount: number;
}

export function AlertsTab({ alertCount }: AlertsTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-alerts" aria-labelledby="tab-alerts">
      <section className="settings-section">
        <h2 className="section-title">알림 관리</h2>
        <p className="section-description">
          출퇴근 알림을 추가하고 관리하세요.
        </p>

        {alertCount === 0 ? (
          <div className="settings-empty-section">
            <span className="empty-icon-svg" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </span>
            <p>설정된 알림이 없어요</p>
            <Link to="/alerts" className="btn btn-primary btn-sm">알림 설정하기</Link>
          </div>
        ) : (
          <div className="settings-shortcut">
            <div className="shortcut-info">
              <span className="shortcut-count">{alertCount}개</span>
              <span className="shortcut-label">등록된 알림</span>
            </div>
            <Link to="/alerts" className="btn btn-primary">
              알림 관리 바로가기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
