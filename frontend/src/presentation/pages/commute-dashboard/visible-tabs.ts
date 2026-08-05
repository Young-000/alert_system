import type { CommuteStatsResponse, RouteAnalyticsResponse } from '@infrastructure/api/commute-api.client';
import type { BehaviorAnalytics } from '@infrastructure/api/behavior-api.client';
import type { StopwatchRecord } from './types';

export type TabId = 'overview' | 'routes' | 'history' | 'stopwatch' | 'analytics' | 'behavior';

interface TabVisibilityInput {
  stats: CommuteStatsResponse | null;
  stopwatchRecords: StopwatchRecord[];
  routeAnalytics: RouteAnalyticsResponse[];
  behaviorAnalytics: BehaviorAnalytics | null;
}

/**
 * 지금 화면에 그릴 수 있는 탭 목록 (표시 순서대로)
 *
 * 탭 버튼(`DashboardTabs`)과 본문(`CommuteDashboardPage`)이 각자 같은 조건을 따로
 * 판단하면 어긋난다 — 버튼은 없는데 그 탭이 선택돼 있으면 본문이 빈 화면이 된다.
 */
export function getVisibleTabs({
  stats,
  stopwatchRecords,
  routeAnalytics,
  behaviorAnalytics,
}: TabVisibilityInput): TabId[] {
  const tabs: TabId[] = [];

  if (stats && stats.totalSessions > 0) {
    tabs.push('overview', 'routes', 'history');
  }
  if (stopwatchRecords.length > 0) {
    tabs.push('stopwatch');
  }
  if (routeAnalytics.length > 0) {
    tabs.push('analytics');
  }
  if (behaviorAnalytics?.hasEnoughData) {
    tabs.push('behavior');
  }

  return tabs;
}

/**
 * 선택된 탭이 보이지 않으면 첫 번째 보이는 탭으로 옮긴다.
 *
 * 보이는 탭이 하나도 없으면 그대로 둔다 — 그때는 페이지가 탭 대신 빈 상태 화면을 그린다.
 */
export function resolveActiveTab(requested: TabId, visibleTabs: TabId[]): TabId {
  if (visibleTabs.length === 0) return requested;
  return visibleTabs.includes(requested) ? requested : visibleTabs[0];
}
