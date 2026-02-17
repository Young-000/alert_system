import { Link } from 'react-router-dom';

interface AppTabProps {
  pushSupported: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;
  isExporting: boolean;
  privacyMessage: string;
  onTogglePush: () => Promise<void>;
  onShowLocalDataReset: () => void;
  onExportData: () => Promise<void>;
  onShowDeleteAllData: () => void;
}

export function AppTab({
  pushSupported,
  pushEnabled,
  pushLoading,
  isExporting,
  privacyMessage,
  onTogglePush,
  onShowLocalDataReset,
  onExportData,
  onShowDeleteAllData,
}: AppTabProps): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-app" aria-labelledby="tab-app">
      <section className="settings-section">
        <h2 className="section-title">앱 설정</h2>

        <div className="settings-card">
          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">버전</span>
              <span className="item-value">1.0.0</span>
            </div>
          </div>

          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">로컬 데이터</span>
              <span className="item-value">스톱워치 기록</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onShowLocalDataReset}
            >
              초기화
            </button>
          </div>
        </div>

        {/* Push Notifications */}
        {pushSupported && (
          <>
            <h2 className="section-title" style={{ marginTop: '1.5rem' }}>푸시 알림</h2>
            <div className="settings-card">
              <div className="settings-item">
                <span className="item-icon-svg" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </span>
                <div className="item-content">
                  <span className="item-label">브라우저 푸시 알림</span>
                  <span className="item-value item-value-small">
                    {pushEnabled ? '활성화됨' : '비활성화'}
                  </span>
                </div>
                <label className="toggle-compact">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={onTogglePush}
                    disabled={pushLoading}
                    aria-label="푸시 알림 켜기/끄기"
                  />
                  <span className="toggle-slider-compact" />
                </label>
              </div>
            </div>
          </>
        )}

        {/* Notification History Link */}
        <div className="settings-card" style={{ marginTop: '1rem' }}>
          <Link to="/notifications" className="settings-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">알림 발송 기록</span>
              <span className="item-value item-value-small">발송 내역 확인</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>

        {/* Privacy Section */}
        <h2 className="section-title" style={{ marginTop: '1.5rem' }}>개인정보</h2>

        <div className="settings-card">
          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">내 데이터 내보내기</span>
              <span className="item-value item-value-small">JSON 파일로 다운로드</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onExportData}
              disabled={isExporting}
            >
              {isExporting ? '처리 중...' : '내보내기'}
            </button>
          </div>

          <div className="settings-item">
            <span className="item-icon-svg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </span>
            <div className="item-content">
              <span className="item-label">추적 데이터 삭제</span>
              <span className="item-value item-value-small">행동 분석·출퇴근 기록</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm danger-text"
              onClick={onShowDeleteAllData}
            >
              삭제
            </button>
          </div>
        </div>

        {privacyMessage && (
          <div className="toast-success" role="status" aria-live="polite" style={{ position: 'relative', marginTop: '0.75rem' }}>
            {privacyMessage}
          </div>
        )}

        <div className="settings-info">
          <p>
            <strong>출퇴근 메이트</strong>
            <br />
            날씨·교통 알림부터 이동 시간 추적까지
          </p>
          <p className="muted">&copy; 2026 All rights reserved</p>
        </div>
      </section>
    </div>
  );
}
