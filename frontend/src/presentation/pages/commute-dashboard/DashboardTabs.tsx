import type { CommuteStatsResponse, RouteAnalyticsResponse } from '@infrastructure/api/commute-api.client';
import type { BehaviorAnalytics } from '@infrastructure/api/behavior-api.client';
import type { StopwatchRecord } from './types';
import type { TabId } from './use-commute-dashboard';

interface DashboardTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  stats: CommuteStatsResponse | null;
  stopwatchRecords: StopwatchRecord[];
  routeAnalytics: RouteAnalyticsResponse[];
  behaviorAnalytics: BehaviorAnalytics | null;
}

export function DashboardTabs({
  activeTab,
  onTabChange,
  stats,
  stopwatchRecords,
  routeAnalytics,
  behaviorAnalytics,
}: DashboardTabsProps): JSX.Element {
  return (
    <div className="dashboard-tabs" role="tablist" aria-label="통근 통계 탭">
      {stats && stats.totalSessions > 0 && (
        <>
          <button
            type="button"
            role="tab"
            id="tab-overview"
            aria-selected={activeTab === 'overview'}
            aria-controls="tabpanel-overview"
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onTabChange('overview')}
          >
            전체 요약
          </button>
          <button
            type="button"
            role="tab"
            id="tab-routes"
            aria-selected={activeTab === 'routes'}
            aria-controls="tabpanel-routes"
            className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => onTabChange('routes')}
          >
            경로 비교
          </button>
          <button
            type="button"
            role="tab"
            id="tab-history"
            aria-selected={activeTab === 'history'}
            aria-controls="tabpanel-history"
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
          >
            기록
          </button>
        </>
      )}
      {stopwatchRecords.length > 0 && (
        <button
          type="button"
          role="tab"
          id="tab-stopwatch"
          aria-selected={activeTab === 'stopwatch'}
          aria-controls="tabpanel-stopwatch"
          className={`tab ${activeTab === 'stopwatch' ? 'active' : ''}`}
          onClick={() => onTabChange('stopwatch')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          스톱워치 ({stopwatchRecords.length})
        </button>
      )}
      {routeAnalytics.length > 0 && (
        <button
          type="button"
          role="tab"
          id="tab-analytics"
          aria-selected={activeTab === 'analytics'}
          aria-controls="tabpanel-analytics"
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onTabChange('analytics')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          분석
        </button>
      )}
      {behaviorAnalytics?.hasEnoughData && (
        <button
          type="button"
          role="tab"
          id="tab-behavior"
          aria-selected={activeTab === 'behavior'}
          aria-controls="tabpanel-behavior"
          className={`tab ${activeTab === 'behavior' ? 'active' : ''}`}
          onClick={() => onTabChange('behavior')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{verticalAlign: 'middle', marginRight: '4px'}}><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
          행동 패턴
        </button>
      )}
    </div>
  );
}
