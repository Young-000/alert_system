import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { AuthRequired } from '../components/AuthRequired';
import {
  useCommuteDashboard,
  DashboardTabs,
  OverviewTab,
  RoutesTab,
  HistoryTab,
  StopwatchTab,
  AnalyticsTab,
  BehaviorTab,
} from './commute-dashboard';

export function CommuteDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const {
    userId,
    stats,
    history,
    setHistory,
    stopwatchRecords,
    selectedRouteId,
    setSelectedRouteId,
    isLoading,
    loadError,
    activeTab,
    setActiveTab,
    routeAnalytics,
    behaviorAnalytics,
    behaviorPatterns,
    routeComparison,
    commuteApi,
    setSearchParams,
  } = useCommuteDashboard();

  if (!userId) {
    return (
      <AuthRequired
        pageTitle="통근 통계"
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        description="통근 통계를 보려면 먼저 로그인하세요"
      />
    );
  }

  if (isLoading) {
    return (
      <main className="page">
        <nav className="nav">
          <button type="button" className="brand nav-back-btn" onClick={() => navigate(-1)} aria-label="뒤로 가기">← 홈</button>
        </nav>
        <div className="loading-container" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <p>통계를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <button type="button" className="nav-back" onClick={() => navigate(-1)} aria-label="뒤로 가기">←</button>
          <strong>통근 통계</strong>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/commute">
            트래킹
          </Link>
          <Link className="btn btn-ghost" to="/routes">
            경로 설정
          </Link>
        </div>
      </nav>

      {loadError && (
        <div className="notice error" role="alert" style={{ margin: '0 1rem 0.75rem' }}>
          {loadError}
        </div>
      )}

      {(!stats || stats.totalSessions === 0) && stopwatchRecords.length === 0 ? (
        <EmptyState
          icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
          title="아직 기록이 없어요"
          description="출퇴근 트래킹을 시작해보세요. 이동 시간을 기록하면 통계를 볼 수 있어요."
          actionLink="/commute"
          actionText="트래킹 시작하기"
        />
      ) : (
        <div className="dashboard-container">
          <DashboardTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSearchParams({ tab }, { replace: true });
            }}
            stats={stats}
            stopwatchRecords={stopwatchRecords}
            routeAnalytics={routeAnalytics}
            behaviorAnalytics={behaviorAnalytics}
          />

          {activeTab === 'overview' && stats && (
            <OverviewTab stats={stats} />
          )}

          {activeTab === 'routes' && stats && (
            <RoutesTab
              stats={stats}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              routeComparison={routeComparison}
            />
          )}

          {activeTab === 'history' && history && (
            <HistoryTab
              history={history}
              onLoadMore={async () => {
                const moreHistory = await commuteApi.getHistory(userId, 10, history.sessions.length);
                setHistory(prev => {
                  if (!prev) return moreHistory;
                  return {
                    ...prev,
                    sessions: [...prev.sessions, ...moreHistory.sessions],
                    hasMore: moreHistory.hasMore,
                  };
                });
              }}
            />
          )}

          {activeTab === 'stopwatch' && stopwatchRecords.length > 0 && (
            <StopwatchTab records={stopwatchRecords} />
          )}

          {activeTab === 'analytics' && routeAnalytics.length > 0 && (
            <AnalyticsTab routeAnalytics={routeAnalytics} />
          )}

          {activeTab === 'behavior' && (
            <BehaviorTab
              behaviorAnalytics={behaviorAnalytics}
              behaviorPatterns={behaviorPatterns}
            />
          )}
        </div>
      )}

      <div className="cross-link-section">
        <Link to="/alerts" className="cross-link-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span>알림 설정하기</span>
          <span className="cross-link-arrow">→</span>
        </Link>
      </div>

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 출퇴근 통계</p>
      </footer>
    </main>
  );
}
