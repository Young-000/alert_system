import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import {
  getCommuteApiClient,
  type CommuteStatsResponse,
  type CommuteHistoryResponse,
  type RouteAnalyticsResponse,
  type RouteComparisonResponse,
} from '@infrastructure/api/commute-api.client';
import {
  getBehaviorApiClient,
  type BehaviorAnalytics,
  type UserPattern,
} from '@infrastructure/api/behavior-api.client';
import { getStopwatchRecords, type StopwatchRecord } from './types';
import { getVisibleTabs, resolveActiveTab, type TabId } from './visible-tabs';

export type { TabId } from './visible-tabs';

interface UseCommuteDashboardReturn {
  userId: string;
  stats: CommuteStatsResponse | null;
  history: CommuteHistoryResponse | null;
  setHistory: React.Dispatch<React.SetStateAction<CommuteHistoryResponse | null>>;
  stopwatchRecords: StopwatchRecord[];
  selectedRouteId: string | null;
  setSelectedRouteId: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  loadError: string;
  retryLoad: () => void;
  /** 실제로 렌더되는 탭 (보이지 않는 탭이 선택되면 첫 번째 보이는 탭으로 대체된다) */
  activeTab: TabId;
  setActiveTab: React.Dispatch<React.SetStateAction<TabId>>;
  visibleTabs: TabId[];
  routeAnalytics: RouteAnalyticsResponse[];
  analyticsError: string;
  comparisonError: string;
  behaviorError: string;
  behaviorAnalytics: BehaviorAnalytics | null;
  behaviorPatterns: UserPattern[];
  routeComparison: RouteComparisonResponse | null;
  commuteApi: ReturnType<typeof getCommuteApiClient>;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}

export function useCommuteDashboard(): UseCommuteDashboardReturn {
  const { userId } = useAuth();
  const commuteApi = getCommuteApiClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [stats, setStats] = useState<CommuteStatsResponse | null>(null);
  const [history, setHistory] = useState<CommuteHistoryResponse | null>(null);
  const [stopwatchRecords, setStopwatchRecords] = useState<StopwatchRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestedTab, setRequestedTab] = useState<TabId>('overview');
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalyticsResponse[]>([]);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<BehaviorAnalytics | null>(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState<UserPattern[]>([]);
  const [routeComparison, setRouteComparison] = useState<RouteComparisonResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [comparisonError, setComparisonError] = useState('');
  const [behaviorError, setBehaviorError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const retryLoad = useCallback((): void => {
    setLoadError('');
    setRetryKey(k => k + 1);
  }, []);

  // Handle URL tab parameter first (highest priority) -- validate tab is actually visible
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (!urlTab) return;
    const validTabs: TabId[] = ['overview', 'routes', 'history', 'stopwatch', 'analytics', 'behavior'];
    if (!validTabs.includes(urlTab as TabId)) return;
    // 'behavior' tab requires hasEnoughData -- if not available yet, fall back to overview
    if (urlTab === 'behavior' && !behaviorAnalytics?.hasEnoughData) {
      setRequestedTab('overview');
      return;
    }
    setRequestedTab(urlTab as TabId);
  }, [searchParams, behaviorAnalytics]);

  // 선택된 탭이 실제로 렌더되는지는 데이터가 도착해야 알 수 있다.
  // 버튼이 없는 탭이 선택된 채로 남으면 본문이 빈 화면이 되므로 여기서 바로잡는다.
  const visibleTabs = useMemo(
    () => getVisibleTabs({ stats, stopwatchRecords, routeAnalytics, behaviorAnalytics }),
    [stats, stopwatchRecords, routeAnalytics, behaviorAnalytics],
  );
  const activeTab = resolveActiveTab(requestedTab, visibleTabs);

  // Load stopwatch records from localStorage (no auto tab switch)
  useEffect(() => {
    const records = getStopwatchRecords();
    setStopwatchRecords(records);
  }, []);

  // Load data from API
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const [statsData, historyData, analyticsData] = await Promise.all([
          commuteApi.getStats(userId, 30),
          commuteApi.getHistory(userId, 10),
          commuteApi.getUserAnalytics(userId).catch(() => {
            if (isMounted) setAnalyticsError('분석 데이터를 불러올 수 없습니다');
            return [] as RouteAnalyticsResponse[];
          }),
        ]);
        if (!isMounted) return;
        setStats(statsData);
        setHistory(historyData);
        setRouteAnalytics(analyticsData);

        if (statsData.routeStats.length > 0) {
          setSelectedRouteId(statsData.routeStats[0].routeId);
        }

        // A-4: Load route comparison if 2+ routes
        if (statsData.routeStats.length >= 2) {
          const routeIds = statsData.routeStats.map(r => r.routeId);
          commuteApi.compareRoutes(routeIds)
            .then(comparison => { if (isMounted) setRouteComparison(comparison); })
            .catch(() => { if (isMounted) setComparisonError('비교 데이터를 불러올 수 없습니다'); });
        }

        // A-2: Load behavior data
        const behaviorApi = getBehaviorApiClient();
        behaviorApi.getAnalytics(userId)
          .then(analytics => {
            if (!isMounted) return;
            setBehaviorAnalytics(analytics);
            if (analytics.hasEnoughData) {
              behaviorApi.getPatterns(userId)
                .then(patterns => { if (isMounted) setBehaviorPatterns(patterns); })
                .catch(() => { if (isMounted) setBehaviorError('패턴 분석에 실패했습니다'); });
            }
          })
          .catch(() => { if (isMounted) setBehaviorError('패턴 분석에 실패했습니다'); });
      } catch {
        if (isMounted) setLoadError('대시보드 데이터를 불러올 수 없습니다.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, commuteApi, retryKey]);

  return {
    userId,
    stats,
    history,
    setHistory,
    stopwatchRecords,
    selectedRouteId,
    setSelectedRouteId,
    isLoading,
    loadError,
    retryLoad,
    activeTab,
    setActiveTab: setRequestedTab,
    visibleTabs,
    routeAnalytics,
    analyticsError,
    comparisonError,
    behaviorError,
    behaviorAnalytics,
    behaviorPatterns,
    routeComparison,
    commuteApi,
    searchParams,
    setSearchParams,
  };
}
