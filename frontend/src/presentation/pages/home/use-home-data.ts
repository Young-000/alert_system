import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useUserLocation } from '@presentation/hooks/useUserLocation';
import { behaviorCollector } from '@infrastructure/analytics/behavior-collector';
import { behaviorApiClient } from '@infrastructure/api';
import type { Alert, WeatherData, DeparturePrediction } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse, type CommuteStatsResponse, type RouteRecommendationResponse } from '@infrastructure/api/commute-api.client';
import { useAlertsQuery } from '@infrastructure/query/use-alerts-query';
import { useRoutesQuery } from '@infrastructure/query/use-routes-query';
import { useWeatherQuery } from '@infrastructure/query/use-weather-query';
import { useAirQualityQuery } from '@infrastructure/query/use-air-quality-query';
import { useCommuteStatsQuery } from '@infrastructure/query/use-commute-stats-query';
import { useTransitQuery } from '@infrastructure/query/use-transit-query';
import {
  getAqiStatus,
  getWeatherChecklist,
  getWeatherType,
  getCheckedItems,
  saveCheckedItems,
  DEPARTURE_PREDICTION_CONFIDENCE_THRESHOLD,
  ROUTE_RECOMMENDATION_CONFIDENCE_THRESHOLD,
} from './weather-utils';
import type { ChecklistItem } from './weather-utils';
import { getActiveRoute } from './route-utils';
import type { TransitArrivalInfo } from './route-utils';
import { computeNextAlert } from './alert-schedule-utils';

export interface UseHomeDataReturn {
  isLoggedIn: boolean;
  userId: string;
  userName: string;
  isLoading: boolean;
  loadError: string;
  weather: WeatherData | null;
  weatherError: string;
  airQualityError: string;
  airQuality: { label: string; className: string };
  checklistItems: ChecklistItem[];
  checkedItems: Set<string>;
  handleChecklistToggle: (id: string) => void;
  departurePrediction: DeparturePrediction | null;
  routeRecommendation: RouteRecommendationResponse | null;
  routeRecDismissed: boolean;
  setRouteRecDismissed: (v: boolean) => void;
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;
  forceRouteType: 'auto' | 'morning' | 'evening';
  setForceRouteType: (v: 'auto' | 'morning' | 'evening') => void;
  transitInfos: TransitArrivalInfo[];
  isTransitRefreshing: boolean;
  lastTransitUpdate: number | null;
  alerts: Alert[];
  nextAlert: { time: string; label: string } | null;
  commuteStats: CommuteStatsResponse | null;
  isDefaultLocation: boolean;
  isCommuteStarting: boolean;
  handleStartCommute: () => Promise<void>;
  retryLoad: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

export function useHomeData(): UseHomeDataReturn {
  const navigate = useNavigate();
  const { userId, userName, isLoggedIn } = useAuth();

  // User location (geolocation + localStorage cache + Seoul fallback)
  const userLocation = useUserLocation();

  // Server state via react-query
  const alertsQuery = useAlertsQuery(userId);
  const routesQuery = useRoutesQuery(userId);
  const statsQuery = useCommuteStatsQuery(userId, 7);

  const locationReady = !!userId && !userLocation.isLoading;
  const weatherQuery = useWeatherQuery(
    userLocation.latitude, userLocation.longitude, locationReady,
  );
  const airQualityQuery = useAirQualityQuery(
    userLocation.latitude, userLocation.longitude, locationReady,
  );

  // Derive values from query results (maintains existing interface)
  // useMemo prevents new array/null references on every render when data is undefined
  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const routes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);
  const commuteStats = statsQuery.data ?? null;
  const weather = weatherQuery.data ?? null;
  const airQualityData = airQualityQuery.data ?? null;

  // Core data loading state — matches existing isLoading semantics
  const isLoading = !userId
    ? false
    : alertsQuery.isLoading || routesQuery.isLoading || statsQuery.isLoading;
  const loadError = [alertsQuery.error, routesQuery.error, statsQuery.error]
    .filter(Boolean)
    .map(() => '데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
    [0] ?? '';

  // Weather/air quality errors (independent, non-blocking)
  const weatherError = weatherQuery.error ? '날씨 정보를 불러올 수 없습니다' : '';
  const airQualityError = airQualityQuery.error ? '미세먼지 정보 없음' : '';

  // Local UI state (not server state)
  const [isCommuteStarting, setIsCommuteStarting] = useState(false);
  const [forceRouteType, setForceRouteType] = useState<'auto' | 'morning' | 'evening'>('auto');
  const [departurePrediction, setDeparturePrediction] = useState<DeparturePrediction | null>(null);
  const [routeRecommendation, setRouteRecommendation] = useState<RouteRecommendationResponse | null>(null);
  const [routeRecDismissed, setRouteRecDismissed] = useState(() => sessionStorage.getItem('routeRecDismissed') === 'true');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(getCheckedItems);

  // Initialize behavior collector
  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // A-1: Load optimal departure prediction
  useEffect(() => {
    let isMounted = true;
    if (!userId || alerts.length === 0 || !weather) return;

    const enabledAlert = alerts.find(a => a.enabled);
    if (!enabledAlert) return;

    behaviorApiClient.getOptimalDeparture(userId, enabledAlert.id, {
      weather: weather.condition,
      temperature: Math.round(weather.temperature),
      isRaining: getWeatherType(weather.condition) === 'rainy',
    })
      .then(prediction => {
        if (isMounted && prediction && prediction.confidence >= DEPARTURE_PREDICTION_CONFIDENCE_THRESHOLD) {
          setDeparturePrediction(prediction);
        }
      })
      .catch(err => console.warn('Failed to load departure prediction:', err));

    return () => { isMounted = false; };
  }, [userId, alerts, weather]);

  // A-3: Load weather route recommendation
  useEffect(() => {
    let isMounted = true;
    if (!userId || routes.length < 2 || !weather) return;

    const commuteApi = getCommuteApiClient();
    commuteApi.getWeatherRouteRecommendation(userId, weather.condition)
      .then(rec => {
        if (isMounted && rec.confidence > ROUTE_RECOMMENDATION_CONFIDENCE_THRESHOLD && rec.recommendation) {
          setRouteRecommendation(rec);
        }
      })
      .catch(err => console.warn('Failed to load route recommendation:', err));

    return () => { isMounted = false; };
  }, [userId, routes, weather]);

  // Active route
  const activeRoute = useMemo(() => getActiveRoute(routes, forceRouteType), [routes, forceRouteType]);

  // Transit arrivals via react-query (auto-refreshes every 30 seconds)
  const transitQuery = useTransitQuery(activeRoute);
  const transitInfos = useMemo(() => transitQuery.data ?? [], [transitQuery.data]);
  const isTransitRefreshing = transitQuery.isFetching && !transitQuery.isLoading;
  const lastTransitUpdate = transitQuery.dataUpdatedAt || null;

  // Next alert time (delegated to pure function for testability)
  const nextAlert = useMemo(() => computeNextAlert(alerts), [alerts]);

  const airQuality = useMemo(() => getAqiStatus(airQualityData?.pm10), [airQualityData]);

  // B-10: Weather checklist items
  const checklistItems = useMemo(() => {
    if (!weather) return [];
    return getWeatherChecklist(weather, airQuality);
  }, [weather, airQuality]);

  const handleChecklistToggle = useCallback((id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCheckedItems(next);
      return next;
    });
  }, []);

  const handleStartCommute = useCallback(async (): Promise<void> => {
    if (!activeRoute || isCommuteStarting) return;
    setIsCommuteStarting(true);
    try {
      const commuteApi = getCommuteApiClient();
      const session = await commuteApi.startSession({
        userId,
        routeId: activeRoute.id,
      });
      navigate('/commute', { state: { sessionId: session.id, routeId: activeRoute.id } });
    } catch {
      navigate('/commute', { state: { routeId: activeRoute.id } });
    } finally {
      setIsCommuteStarting(false);
    }
  }, [activeRoute, isCommuteStarting, userId, navigate]);

  return {
    isLoggedIn,
    userId,
    userName,
    isLoading,
    loadError,
    weather,
    weatherError,
    airQualityError,
    airQuality,
    checklistItems,
    checkedItems,
    handleChecklistToggle,
    departurePrediction,
    routeRecommendation,
    routeRecDismissed,
    setRouteRecDismissed,
    routes,
    activeRoute,
    forceRouteType,
    setForceRouteType,
    transitInfos,
    isTransitRefreshing,
    lastTransitUpdate,
    alerts,
    nextAlert,
    commuteStats,
    isDefaultLocation: userLocation.isDefault,
    isCommuteStarting,
    handleStartCommute,
    retryLoad: () => {
      alertsQuery.refetch();
      routesQuery.refetch();
      statsQuery.refetch();
    },
    navigate,
  };
}
