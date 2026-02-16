import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export type TabId = 'overview' | 'routes' | 'history' | 'stopwatch' | 'analytics' | 'behavior';

interface UseCommuteDashboardReturn {
  userId: string;
  stats: CommuteStatsResponse | null;
  history: CommuteHistoryResponse | null;
  setHistory: React.Dispatch<React.SetStateAction<CommuteHistoryResponse | null>>;
  stopwatchRecords: StopwatchRecord[];
  selectedRouteId: string | null;
  setSelectedRouteId: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  activeTab: TabId;
  setActiveTab: React.Dispatch<React.SetStateAction<TabId>>;
  routeAnalytics: RouteAnalyticsResponse[];
  behaviorAnalytics: BehaviorAnalytics | null;
  behaviorPatterns: UserPattern[];
  routeComparison: RouteComparisonResponse | null;
  commuteApi: ReturnType<typeof getCommuteApiClient>;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}

export function useCommuteDashboard(): UseCommuteDashboardReturn {
  const userId = localStorage.getItem('userId') || '';
  const commuteApi = useMemo(() => getCommuteApiClient(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [stats, setStats] = useState<CommuteStatsResponse | null>(null);
  const [history, setHistory] = useState<CommuteHistoryResponse | null>(null);
  const [stopwatchRecords, setStopwatchRecords] = useState<StopwatchRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalyticsResponse[]>([]);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<BehaviorAnalytics | null>(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState<UserPattern[]>([]);
  const [routeComparison, setRouteComparison] = useState<RouteComparisonResponse | null>(null);

  // Handle URL tab parameter first (highest priority) -- validate tab is actually visible
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (!urlTab) return;
    const validTabs: TabId[] = ['overview', 'routes', 'history', 'stopwatch', 'analytics', 'behavior'];
    if (!validTabs.includes(urlTab as TabId)) return;
    // 'behavior' tab requires hasEnoughData -- if not available yet, fall back to overview
    if (urlTab === 'behavior' && !behaviorAnalytics?.hasEnoughData) {
      setActiveTab('overview');
      return;
    }
    setActiveTab(urlTab as TabId);
  }, [searchParams, behaviorAnalytics]);

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
          commuteApi.getUserAnalytics(userId).catch(() => [] as RouteAnalyticsResponse[]),
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
            .catch(() => {});
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
                .catch(() => {});
            }
          })
          .catch(() => {});
      } catch {
        if (!isMounted) return;
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
  }, [userId, commuteApi]);

  return {
    userId,
    stats,
    history,
    setHistory,
    stopwatchRecords,
    selectedRouteId,
    setSelectedRouteId,
    isLoading,
    activeTab,
    setActiveTab,
    routeAnalytics,
    behaviorAnalytics,
    behaviorPatterns,
    routeComparison,
    commuteApi,
    searchParams,
    setSearchParams,
  };
}
