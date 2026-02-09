import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alertApiClient, userApiClient } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';
import type { Alert } from '@infrastructure/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@infrastructure/push/push-manager';

type SettingsTab = 'profile' | 'routes' | 'alerts' | 'app';

export function SettingsPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const phoneNumber = localStorage.getItem('phoneNumber') || '';

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Data states
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ type: 'alert' | 'route'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 로컬 데이터 초기화 모달
  const [showLocalDataReset, setShowLocalDataReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Push notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Privacy
  const [showDeleteAllData, setShowDeleteAllData] = useState(false);
  const [isDeletingAllData, setIsDeletingAllData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');

  const commuteApi = getCommuteApiClient();

  // Load data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [alertsData, routesData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch(() => []),
          commuteApi.getUserRoutes(userId).catch(() => []),
        ]);
        if (!isMounted) return;
        setAlerts(alertsData);
        setRoutes(routesData);
      } catch (err) {
        console.error('Failed to load settings data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  // Toggle alert
  const handleToggleAlert = async (alertId: string) => {
    try {
      await alertApiClient.toggleAlert(alertId);
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, enabled: !a.enabled } : a
      ));
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  // Delete handlers
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'alert') {
        await alertApiClient.deleteAlert(deleteModal.id);
        setAlerts(prev => prev.filter(a => a.id !== deleteModal.id));
      } else {
        await commuteApi.deleteRoute(deleteModal.id);
        setRoutes(prev => prev.filter(r => r.id !== deleteModal.id));
      }
      setDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check push notification status
  useEffect(() => {
    isPushSupported().then(setPushSupported);
    isPushSubscribed().then(setPushEnabled);
  }, []);

  // Toggle push notifications
  const handleTogglePush = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
      }
    } catch {
      // Permission denied or error
    } finally {
      setPushLoading(false);
    }
  };

  // Export user data
  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setPrivacyMessage('');
    try {
      const data = await userApiClient.exportData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPrivacyMessage('데이터가 다운로드되었습니다.');
    } catch {
      setPrivacyMessage('데이터 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setPrivacyMessage(''), 3000);
    }
  };

  // Delete all tracking data
  const handleDeleteAllData = async () => {
    setIsDeletingAllData(true);
    setPrivacyMessage('');
    try {
      await userApiClient.deleteAllData(userId);
      setShowDeleteAllData(false);
      setPrivacyMessage('추적 데이터가 삭제되었습니다.');
    } catch {
      setPrivacyMessage('데이터 삭제에 실패했습니다.');
    } finally {
      setIsDeletingAllData(false);
      setTimeout(() => setPrivacyMessage(''), 3000);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('phoneNumber');
    navigate('/');
    window.location.reload();
  };

  // Format schedule time
  const formatScheduleTime = (schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length >= 2) {
      const hours = parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`);
      return hours.join(', ');
    }
    return schedule;
  };

  // Not logged in
  if (!userId) {
    return (
      <main className="page settings-page">
        <header className="settings-page-v2-header">
          <h1>설정</h1>
        </header>
        <div className="settings-empty">
          <span className="empty-icon-svg" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <h2>로그인이 필요해요</h2>
          <p>설정을 관리하려면 먼저 로그인하세요</p>
          <Link to="/login" className="btn btn-primary">로그인</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page settings-page">
      {/* Header */}
      <header className="settings-page-v2-header">
        <h1>내 설정</h1>
      </header>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>프로필</span>
        </button>
        <button
          type="button"
          className={`settings-tab ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>경로</span>
          {routes.length > 0 && <span className="tab-badge">{routes.length}</span>}
        </button>
        <button
          type="button"
          className={`settings-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span>알림</span>
          {alerts.filter(a => a.enabled).length > 0 && (
            <span className="tab-badge">{alerts.filter(a => a.enabled).length}</span>
          )}
        </button>
        <button
          type="button"
          className={`settings-tab ${activeTab === 'app' ? 'active' : ''}`}
          onClick={() => setActiveTab('app')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>앱</span>
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="settings-loading">
          <span className="spinner" />
          <p>불러오는 중...</p>
        </div>
      )}

      {/* Tab Content */}
      {!isLoading && (
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
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
                    <span className="item-value item-value-small">{userId.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline settings-logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </section>
          )}

          {/* Routes Tab */}
          {activeTab === 'routes' && (
            <section className="settings-section">
              <div className="section-header">
                <h2 className="section-title">내 경로</h2>
                <Link to="/routes" className="section-action">+ 추가</Link>
              </div>

              {routes.length === 0 ? (
                <div className="settings-empty-section">
                  <span className="empty-icon-svg" aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <p>등록된 경로가 없어요</p>
                  <Link to="/routes" className="btn btn-primary btn-sm">경로 추가하기</Link>
                </div>
              ) : (
                <div className="settings-list">
                  {routes.map((route) => (
                    <div key={route.id} className="settings-list-item">
                      <div className="list-item-main">
                        <span className={`route-type-badge ${route.routeType}`}>
                          {route.routeType === 'morning' ? '출근' : '퇴근'}
                        </span>
                        <div className="list-item-content">
                          <span className="list-item-title">{route.name}</span>
                          <span className="list-item-subtitle">
                            {route.checkpoints.map(c => c.name).join(' → ')}
                          </span>
                        </div>
                      </div>
                      <div className="list-item-actions">
                        <Link
                          to={`/commute?routeId=${route.id}`}
                          className="btn-icon"
                          title="트래킹 시작"
                          aria-label="트래킹 시작"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </Link>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => setDeleteModal({ type: 'route', id: route.id, name: route.name })}
                          aria-label="삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <section className="settings-section">
              <div className="section-header">
                <h2 className="section-title">내 알림</h2>
                <Link to="/alerts" className="section-action">+ 추가</Link>
              </div>

              {alerts.length === 0 ? (
                <div className="settings-empty-section">
                  <span className="empty-icon-svg" aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </span>
                  <p>설정된 알림이 없어요</p>
                  <Link to="/alerts" className="btn btn-primary btn-sm">알림 설정하기</Link>
                </div>
              ) : (
                <div className="settings-list">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`settings-list-item ${!alert.enabled ? 'disabled' : ''}`}
                    >
                      <div className="list-item-main">
                        <div className="list-item-content">
                          <div className="alert-item-header">
                            <span className="list-item-title">{alert.name}</span>
                            <span className="alert-time-badge">
                              {formatScheduleTime(alert.schedule)}
                            </span>
                          </div>
                          <div className="alert-type-tags">
                            {alert.alertTypes.map(type => (
                              <span key={type} className={`alert-type-tag ${type}`}>
                                {type === 'weather' ? '날씨' : type === 'airQuality' ? '미세먼지' : type === 'subway' ? '지하철' : type === 'bus' ? '버스' : type}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="list-item-actions">
                        <label className="toggle-compact">
                          <input
                            type="checkbox"
                            checked={alert.enabled}
                            onChange={() => handleToggleAlert(alert.id)}
                            aria-label={`${alert.name} ${alert.enabled ? '끄기' : '켜기'}`}
                          />
                          <span className="toggle-slider-compact" />
                        </label>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => setDeleteModal({ type: 'alert', id: alert.id, name: alert.name })}
                          aria-label="삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* App Settings Tab */}
          {activeTab === 'app' && (
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
                    onClick={() => setShowLocalDataReset(true)}
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
                          onChange={handleTogglePush}
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
                    onClick={handleExportData}
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
                    onClick={() => setShowDeleteAllData(true)}
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
                <p className="muted">© 2025 All rights reserved</p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <ConfirmModal
          open={true}
          title={deleteModal.type === 'alert' ? '알림 삭제' : '경로 삭제'}
          confirmText="삭제"
          cancelText="취소"
          confirmVariant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
        >
          <p>&ldquo;{deleteModal.name}&rdquo;을(를) 삭제하시겠습니까?</p>
          <p className="muted">삭제 후에는 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}

      {/* 로컬 데이터 초기화 모달 */}
      <ConfirmModal
        open={showLocalDataReset}
        title="로컬 데이터 초기화"
        confirmText="초기화"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={() => {
          localStorage.removeItem('commute_stopwatch_records');
          setShowLocalDataReset(false);
          setResetSuccess(true);
          setTimeout(() => setResetSuccess(false), 3000);
        }}
        onCancel={() => setShowLocalDataReset(false)}
      >
        <p>로컬 스톱워치 기록을 삭제하시겠습니까?</p>
        <p className="muted">삭제된 데이터는 복구할 수 없습니다.</p>
      </ConfirmModal>

      {/* 추적 데이터 삭제 모달 */}
      <ConfirmModal
        open={showDeleteAllData}
        title="추적 데이터 삭제"
        confirmText="전체 삭제"
        cancelText="취소"
        confirmVariant="danger"
        isLoading={isDeletingAllData}
        onConfirm={handleDeleteAllData}
        onCancel={() => setShowDeleteAllData(false)}
      >
        <p>행동 분석 데이터와 출퇴근 기록을 모두 삭제합니다.</p>
        <p className="muted">계정과 알림 설정은 유지됩니다. 이 작업은 되돌릴 수 없습니다.</p>
      </ConfirmModal>

      {/* 초기화 완료 토스트 */}
      {resetSuccess && (
        <div className="toast-success" role="status" aria-live="polite">
          ✓ 삭제되었습니다.
        </div>
      )}
    </main>
  );
}
