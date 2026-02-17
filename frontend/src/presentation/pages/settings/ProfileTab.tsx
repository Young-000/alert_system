interface ProfileTabProps {
  phoneNumber: string;
  userId: string;
  onCopyUserId: () => void;
  onLogout: () => void;
}

export function ProfileTab({ phoneNumber, userId, onCopyUserId, onLogout }: ProfileTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-profile" aria-labelledby="tab-profile">
      <section className="settings-section">
        <h2 className="section-title">내 정보</h2>

        <div className="settings-card">
          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">전화번호</span>
              <span className="item-value">{phoneNumber || '미등록'}</span>
            </div>
            <span className="item-hint">알림톡 수신</span>
          </div>

          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">사용자 ID</span>
              <span className="item-value item-value-small">{userId.slice(0, 4)}...</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={onCopyUserId}
              aria-label="ID 복사"
              title="ID 복사"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline settings-logout"
          onClick={onLogout}
        >
          로그아웃
        </button>
      </section>
    </div>
  );
}
