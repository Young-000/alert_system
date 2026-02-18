import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  fetchAirQuality,
  fetchAlerts,
  fetchBusArrival,
  fetchCommuteStats,
  fetchRoutes,
  fetchSubwayArrival,
  fetchWeather,
  fetchWidgetData,
} from '@/services/home.service';
import { widgetSyncService } from '@/services/widget-sync.service';
import { getAqiStatus } from '@/utils/weather';
import { getActiveRoute } from '@/utils/route';
import { computeNextAlert } from '@/utils/alert-schedule';

import type {
  AirQualityData,
  Alert,
  AqiStatus,
  CommuteStatsResponse,
  RouteResponse,
  TransitArrivalInfo,
  WeatherData,
} from '@/types/home';

// ─── Constants ─────────────────────────────────────

const TRANSIT_REFETCH_INTERVAL_MS = 30 * 1000;
const DEFAULT_LOCATION = { latitude: 37.5665, longitude: 126.9780 };

// ─── Return Type ──────────────────────────────────

export type UseHomeDataReturn = {
  // Auth
  isLoggedIn: boolean;
  userName: string;

  // Loading / Error
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;

  // Weather
  weather: WeatherData | null;
  weatherError: string | null;
  airQuality: AirQualityData | null;
  airQualityError: string | null;
  aqiStatus: AqiStatus;

  // Routes
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;

  // Transit
  transitInfos: TransitArrivalInfo[];
  isTransitRefreshing: boolean;
  lastTransitUpdate: number | null;

  // Alerts
  alerts: Alert[];
  nextAlert: { time: string; label: string } | null;

  // Stats
  commuteStats: CommuteStatsResponse | null;

  // Actions
  onRefresh: () => Promise<void>;
  retryLoad: () => void;
};

// ─── Hook ─────────────────────────────────────────

export function useHomeData(): UseHomeDataReturn {
  const { user, isLoggedIn } = useAuth();
  const userId = user?.id ?? '';
  const userName = user?.name ?? '';

  // ── State ──
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [airQualityError, setAirQualityError] = useState<string | null>(null);

  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [commuteStats, setCommuteStats] = useState<CommuteStatsResponse | null>(null);

  const [transitInfos, setTransitInfos] = useState<TransitArrivalInfo[]>([]);
  const [isTransitRefreshing, setIsTransitRefreshing] = useState(false);
  const [lastTransitUpdate, setLastTransitUpdate] = useState<number | null>(null);

  // ── Refs ──
  const transitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const activeRouteRef = useRef<RouteResponse | null>(null);

  // ── Derived ──
  const activeRoute = getActiveRoute(routes, 'auto');
  activeRouteRef.current = activeRoute;

  const aqiStatus = getAqiStatus(airQuality?.pm10);
  const nextAlert = computeNextAlert(alerts);

  // ── Fetch Weather + Air Quality ──
  const fetchWeatherData = useCallback(async (): Promise<void> => {
    const { latitude, longitude } = DEFAULT_LOCATION;

    try {
      const data = await fetchWeather(latitude, longitude);
      if (isMountedRef.current) {
        setWeather(data);
        setWeatherError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setWeatherError('날씨 정보를 불러올 수 없습니다');
      }
    }

    try {
      const data = await fetchAirQuality(latitude, longitude);
      if (isMountedRef.current) {
        setAirQuality(data);
        setAirQualityError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setAirQualityError('미세먼지 정보 없음');
      }
    }
  }, []);

  // ── Fetch Transit Arrivals ──
  const fetchTransitArrivals = useCallback(
    async (route: RouteResponse): Promise<void> => {
      if (!isMountedRef.current) return;
      setIsTransitRefreshing(true);

      const subwayCheckpoints = route.checkpoints.filter(
        (cp) => cp.checkpointType === 'subway' && cp.name,
      );
      const busCheckpoints = route.checkpoints.filter(
        (cp) => cp.checkpointType === 'bus_stop' && cp.linkedBusStopId,
      );

      const infos: TransitArrivalInfo[] = [];

      // Fetch subway arrivals (max 2)
      for (const cp of subwayCheckpoints.slice(0, 2)) {
        try {
          const arrivals = await fetchSubwayArrival(cp.name);
          infos.push({
            type: 'subway',
            name: cp.name,
            arrivals,
            isLoading: false,
          });
        } catch {
          infos.push({
            type: 'subway',
            name: cp.name,
            arrivals: [],
            isLoading: false,
            error: '조회 실패',
          });
        }
      }

      // Fetch bus arrivals (max 2)
      for (const cp of busCheckpoints.slice(0, 2)) {
        try {
          const arrivals = await fetchBusArrival(cp.linkedBusStopId!);
          infos.push({
            type: 'bus',
            name: cp.name,
            arrivals,
            isLoading: false,
          });
        } catch {
          infos.push({
            type: 'bus',
            name: cp.name,
            arrivals: [],
            isLoading: false,
            error: '조회 실패',
          });
        }
      }

      if (isMountedRef.current) {
        setTransitInfos(infos);
        setIsTransitRefreshing(false);
        setLastTransitUpdate(Date.now());
      }
    },
    [],
  );

  // ── Fetch All Data ──
  const fetchAllData = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoadError(null);

    const results = await Promise.allSettled([
      fetchWeatherData(),
      fetchRoutes(userId),
      fetchAlerts(userId),
      fetchCommuteStats(userId, 7),
    ]);

    if (!isMountedRef.current) return;

    // Routes result
    const routesResult = results[1];
    if (routesResult?.status === 'fulfilled') {
      setRoutes(routesResult.value);
    } else {
      setRoutes([]);
    }

    // Alerts result
    const alertsResult = results[2];
    if (alertsResult?.status === 'fulfilled') {
      setAlerts(alertsResult.value);
    }

    // Stats result
    const statsResult = results[3];
    if (statsResult?.status === 'fulfilled') {
      setCommuteStats(statsResult.value);
    }

    // Check for critical failures (routes + alerts + stats all failed)
    const criticalFailures = results.slice(1).filter(
      (r) => r?.status === 'rejected',
    );
    if (criticalFailures.length === results.length - 1) {
      setLoadError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    // Sync widget data (fire-and-forget, non-blocking)
    void syncWidgetDataFromApi();
  }, [userId, fetchWeatherData]);

  // ── Widget Data Sync ──
  const syncWidgetDataFromApi = useCallback(async (): Promise<void> => {
    try {
      const widgetData = await fetchWidgetData();
      await widgetSyncService.syncWidgetData(widgetData);
    } catch {
      // Widget sync is non-critical; silently ignore errors
    }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async (): Promise<void> => {
      setIsLoading(true);
      await fetchAllData();
      if (!cancelled && isMountedRef.current) {
        setIsLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userId, fetchAllData]);

  // ── Transit Auto-Refresh (30s interval) ──
  useEffect(() => {
    if (!activeRoute) {
      setTransitInfos([]);
      return;
    }

    // Initial fetch
    void fetchTransitArrivals(activeRoute);

    // Set up interval
    transitIntervalRef.current = setInterval(() => {
      const currentRoute = activeRouteRef.current;
      if (currentRoute) {
        void fetchTransitArrivals(currentRoute);
      }
    }, TRANSIT_REFETCH_INTERVAL_MS);

    return () => {
      if (transitIntervalRef.current) {
        clearInterval(transitIntervalRef.current);
        transitIntervalRef.current = null;
      }
    };
  }, [activeRoute?.id, fetchTransitArrivals]);

  // ── AppState Listener (foreground refresh) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isLoggedIn && userId) {
        void fetchWeatherData();
        const currentRoute = activeRouteRef.current;
        if (currentRoute) {
          void fetchTransitArrivals(currentRoute);
        }
      }
    });

    return () => subscription.remove();
  }, [isLoggedIn, userId, fetchWeatherData, fetchTransitArrivals]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (transitIntervalRef.current) {
        clearInterval(transitIntervalRef.current);
      }
    };
  }, []);

  // ── Pull-to-Refresh Handler ──
  const onRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
      const currentRoute = activeRouteRef.current;
      if (currentRoute) {
        await fetchTransitArrivals(currentRoute);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchAllData, fetchTransitArrivals]);

  // ── Retry Handler ──
  const retryLoad = useCallback((): void => {
    if (!userId) return;
    setIsLoading(true);
    setLoadError(null);
    void fetchAllData().finally(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });
  }, [userId, fetchAllData]);

  return {
    isLoggedIn,
    userName,
    isLoading,
    isRefreshing,
    loadError,
    weather,
    weatherError,
    airQuality,
    airQualityError,
    aqiStatus,
    routes,
    activeRoute,
    transitInfos,
    isTransitRefreshing,
    lastTransitUpdate,
    alerts,
    nextAlert,
    commuteStats,
    onRefresh,
    retryLoad,
  };
}
