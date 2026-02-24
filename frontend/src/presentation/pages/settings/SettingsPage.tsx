import { PageHeader } from '../../components/PageHeader';
import { AuthRequired } from '../../components/AuthRequired';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useSettings } from './use-settings';
import { ProfileTab } from './ProfileTab';
import { RoutesTab } from './RoutesTab';
import { AlertsTab } from './AlertsTab';
import { AppTab } from './AppTab';
import { PlacesTab } from './PlacesTab';
import { SmartDepartureTab } from './SmartDepartureTab';

export function SettingsPage(): JSX.Element {
  const settings = useSettings();

  // Not logged in
  if (!settings.userId) {
    return (
      <AuthRequired
        pageTitle="설정"
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
        description="설정을 관리하려면 먼저 로그인하세요"
      />
    );
  }

  return (
    <main className="page settings-page">
      <PageHeader title="내 설정" />

      {/* Tabs */}
      <div className="settings-tabs" role="tablist" aria-label="설정 탭">
        {([
          { id: 'profile' as const, label: '프로필', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, badge: undefined },
          { id: 'routes' as const, label: '경로', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, badge: settings.routes.length > 0 ? settings.routes.length : undefined },
          { id: 'alerts' as const, label: '알림', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, badge: settings.alerts.filter(a => a.enabled).length > 0 ? settings.alerts.filter(a => a.enabled).length : undefined },
          { id: 'places' as const, label: '장소', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, badge: undefined },
          { id: 'departure' as const, label: '출발', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, badge: undefined },
          { id: 'app' as const, label: '앱', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, badge: undefined },
        ]).map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={settings.activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`settings-tab ${settings.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => settings.setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge != null && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Loading */}
      {settings.isLoading && (
        <div className="settings-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>불러오는 중...</p>
        </div>
      )}

      {/* Action Error */}
      {settings.actionError && (
        <div className="notice error" role="alert" aria-live="assertive" style={{ margin: '0 1rem 0.75rem' }}>
          {settings.actionError}
        </div>
      )}

      {/* Tab Content */}
      {!settings.isLoading && (
        <div className="settings-content">
          {settings.activeTab === 'profile' && (
            <ProfileTab
              phoneNumber={settings.phoneNumber}
              userId={settings.userId}
              onCopyUserId={settings.handleCopyUserId}
              onLogout={settings.handleLogout}
            />
          )}
          {settings.activeTab === 'routes' && (
            <RoutesTab routeCount={settings.routes.length} />
          )}
          {settings.activeTab === 'alerts' && (
            <AlertsTab alertCount={settings.alerts.length} />
          )}
          {settings.activeTab === 'places' && <PlacesTab />}
          {settings.activeTab === 'departure' && <SmartDepartureTab />}
          {settings.activeTab === 'app' && (
            <AppTab
              pushSupported={settings.pushSupported}
              pushEnabled={settings.pushEnabled}
              pushLoading={settings.pushLoading}
              isExporting={settings.isExporting}
              privacyMessage={settings.privacyMessage}
              onTogglePush={settings.handleTogglePush}
              onShowLocalDataReset={() => settings.setShowLocalDataReset(true)}
              onExportData={settings.handleExportData}
              onShowDeleteAllData={() => settings.setShowDeleteAllData(true)}
            />
          )}
        </div>
      )}

      {/* 로컬 데이터 초기화 모달 */}
      <ConfirmModal
        open={settings.showLocalDataReset}
        title="로컬 데이터 초기화"
        confirmText="초기화"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={settings.handleLocalDataReset}
        onCancel={() => settings.setShowLocalDataReset(false)}
      >
        <p>로컬 스톱워치 기록을 삭제하시겠습니까?</p>
        <p className="muted">삭제된 데이터는 복구할 수 없습니다.</p>
      </ConfirmModal>

      {/* 추적 데이터 삭제 모달 */}
      <ConfirmModal
        open={settings.showDeleteAllData}
        title="추적 데이터 삭제"
        confirmText="전체 삭제"
        cancelText="취소"
        confirmVariant="danger"
        isLoading={settings.isDeletingAllData}
        onConfirm={settings.handleDeleteAllData}
        onCancel={() => settings.setShowDeleteAllData(false)}
      >
        <p>행동 분석 데이터와 출퇴근 기록을 모두 삭제합니다.</p>
        <p className="muted">계정과 알림 설정은 유지됩니다. 이 작업은 되돌릴 수 없습니다.</p>
      </ConfirmModal>

      {/* 초기화 완료 토스트 */}
      {settings.resetSuccess && (
        <div className="toast-success" role="status" aria-live="polite">
          &#10003; 삭제되었습니다.
        </div>
      )}
    </main>
  );
}
