import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alertApiClient } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';
import type { Alert } from '@infrastructure/api';
import { ConfirmModal } from '../components/ConfirmModal';

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
        <nav className="settings-nav">
          <Link to="/" className="nav-back">←</Link>
          <span className="nav-title">설정</span>
          <span />
        </nav>
        <div className="settings-empty">
          <span className="empty-icon">🔐</span>
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
      <nav className="settings-nav">
        <Link to="/" className="nav-back">←</Link>
        <span className="nav-title">내 설정</span>
        <span />
      </nav>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span>👤</span>
          <span>프로필</span>
        </button>
        <button
          type="button"
          className={`settings-tab ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <span>📍</span>
          <span>경로</span>
          {routes.length > 0 && <span className="tab-badge">{routes.length}</span>}
        </button>
        <button
          type="button"
          className={`settings-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span>🔔</span>
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
          <span>⚙️</span>
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
              <h2 className="section-title">👤 내 정보</h2>

              <div className="settings-card">
                <div className="settings-item">
                  <span className="item-icon">📱</span>
                  <div className="item-content">
                    <span className="item-label">전화번호</span>
                    <span className="item-value">{phoneNumber || '미등록'}</span>
                  </div>
                  <span className="item-hint">알림톡 수신</span>
                </div>

                <div className="settings-item">
                  <span className="item-icon">🆔</span>
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
                <h2 className="section-title">📍 내 경로</h2>
                <Link to="/routes" className="section-action">+ 추가</Link>
              </div>

              {routes.length === 0 ? (
                <div className="settings-empty-section">
                  <span className="empty-icon">🗺️</span>
                  <p>등록된 경로가 없어요</p>
                  <Link to="/routes" className="btn btn-primary btn-sm">경로 추가하기</Link>
                </div>
              ) : (
                <div className="settings-list">
                  {routes.map((route) => (
                    <div key={route.id} className="settings-list-item">
                      <div className="list-item-main">
                        <span className="list-item-icon">
                          {route.routeType === 'morning' ? '🌅' : '🌆'}
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
                          ▶️
                        </Link>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => setDeleteModal({ type: 'route', id: route.id, name: route.name })}
                          aria-label="삭제"
                        >
                          🗑️
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
                <h2 className="section-title">🔔 내 알림</h2>
                <Link to="/alerts" className="section-action">+ 추가</Link>
              </div>

              {alerts.length === 0 ? (
                <div className="settings-empty-section">
                  <span className="empty-icon">🔕</span>
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
                          <span className="list-item-subtitle">
                            {alert.alertTypes.map(type => {
                              if (type === 'weather') return '🌤️ 날씨';
                              if (type === 'airQuality') return '💨 미세먼지';
                              if (type === 'subway') return '🚇 지하철';
                              if (type === 'bus') return '🚌 버스';
                              return type;
                            }).join(' · ')}
                          </span>
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
                          🗑️
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
              <h2 className="section-title">⚙️ 앱 설정</h2>

              <div className="settings-card">
                <div className="settings-item">
                  <span className="item-icon">📱</span>
                  <div className="item-content">
                    <span className="item-label">버전</span>
                    <span className="item-value">1.0.0</span>
                  </div>
                </div>

                <div className="settings-item">
                  <span className="item-icon">💾</span>
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

      {/* 초기화 완료 토스트 */}
      {resetSuccess && (
        <div className="toast-success" role="status" aria-live="polite">
          ✓ 삭제되었습니다.
        </div>
      )}
    </main>
  );
}
