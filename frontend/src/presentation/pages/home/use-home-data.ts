import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useUserLocation } from '@presentation/hooks/useUserLocation';
import { behaviorCollector } from '@infrastructure/analytics/behavior-collector';
import { alertApiClient, weatherApiClient, airQualityApiClient, busApiClient, subwayApiClient, behaviorApiClient } from '@infrastructure/api';
import type { Alert, WeatherData, AirQualityData, DeparturePrediction } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse, type CommuteStatsResponse, type RouteRecommendationResponse } from '@infrastructure/api/commute-api.client';
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
  alerts: Alert[];
  nextAlert: { time: string; label: string } | null;
  commuteStats: CommuteStatsResponse | null;
  isCommuteStarting: boolean;
  handleStartCommute: () => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}

export function useHomeData(): UseHomeDataReturn {
  const navigate = useNavigate();
  const { userId, userName, isLoggedIn } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [commuteStats, setCommuteStats] = useState<CommuteStatsResponse | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [transitInfos, setTransitInfos] = useState<TransitArrivalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCommuteStarting, setIsCommuteStarting] = useState(false);
  const [forceRouteType, setForceRouteType] = useState<'auto' | 'morning' | 'evening'>('auto');
  const [departurePrediction, setDeparturePrediction] = useState<DeparturePrediction | null>(null);
  const [routeRecommendation, setRouteRecommendation] = useState<RouteRecommendationResponse | null>(null);
  const [routeRecDismissed, setRouteRecDismissed] = useState(() => sessionStorage.getItem('routeRecDismissed') === 'true');
  const [weatherError, setWeatherError] = useState('');
  const [airQualityError, setAirQualityError] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(getCheckedItems);

  // Initialize behavior collector
  useEffect(() => {
    if (userId) {
      behaviorCollector.initialize(userId);
    }
  }, [userId]);

  // Load core data
  useEffect(() => {
    let isMounted = true;
    if (!userId) { setIsLoading(false); return; }

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError('');
      try {
        const commuteApi = getCommuteApiClient();
        const [alertsData, routesData, statsData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch((err) => { console.warn('Failed to load alerts:', err); return []; }),
          commuteApi.getUserRoutes(userId).catch((err) => { console.warn('Failed to load routes:', err); return []; }),
          commuteApi.getStats(userId, 7).catch((err) => { console.warn('Failed to load stats:', err); return null; }),
        ]);
        if (!isMounted) return;
        setAlerts(alertsData);
        setRoutes(routesData);
        setCommuteStats(statsData);
      } catch {
        if (isMounted) setLoadError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userId]);

  // User location (geolocation + localStorage cache + Seoul fallback)
  const userLocation = useUserLocation();

  // Load weather + air quality
  useEffect(() => {
    let isMounted = true;
    if (!userId || userLocation.isLoading) return;

    const lat = userLocation.latitude;
    const lng = userLocation.longitude;

    weatherApiClient.getCurrentWeather(lat, lng)
      .then(data => { if (isMounted) setWeather(data); })
      .catch(() => { if (isMounted) setWeatherError('날씨 정보를 불러올 수 없습니다'); });

    airQualityApiClient.getByLocation(lat, lng)
      .then(data => { if (isMounted) setAirQualityData(data); })
      .catch(() => { if (isMounted) setAirQualityError('미세먼지 정보 없음'); });

    return () => { isMounted = false; };
  }, [userId, userLocation.latitude, userLocation.longitude, userLocation.isLoading]);

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

  // Load transit arrivals
  const loadTransitArrivals = useCallback(async (route: RouteResponse): Promise<void> => {
    const subwayStations = new Set<string>();
    const busStopIds = new Set<string>();

    for (const cp of route.checkpoints) {
      if (cp.transportMode === 'subway' && cp.name) {
        const stationName = cp.name.replace(/역$/, '').replace(/\s*\d+호선.*$/, '');
        subwayStations.add(stationName);
      }
      if (cp.transportMode === 'bus' && cp.linkedBusStopId) {
        busStopIds.add(cp.linkedBusStopId);
      }
    }

    const infos: TransitArrivalInfo[] = [];
    const stationNames = Array.from(subwayStations).slice(0, 2);
    const stopIds = Array.from(busStopIds).slice(0, 2);

    for (const name of stationNames) {
      infos.push({ type: 'subway', name: `${name}역`, arrivals: [], isLoading: true });
    }
    for (const id of stopIds) {
      infos.push({ type: 'bus', name: `정류장 ${id}`, arrivals: [], isLoading: true });
    }
    setTransitInfos([...infos]);

    const promises: Promise<void>[] = [];
    stationNames.forEach((name, idx) => {
      promises.push(
        subwayApiClient.getArrival(name)
          .then(arrivals => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === idx ? { ...info, arrivals: arrivals.slice(0, 3), isLoading: false } : info
            ));
          })
          .catch(() => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === idx ? { ...info, isLoading: false, error: '조회 실패' } : info
            ));
          })
      );
    });

    const subwayCount = stationNames.length;
    stopIds.forEach((id, idx) => {
      promises.push(
        busApiClient.getArrival(id)
          .then(arrivals => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === subwayCount + idx
                ? { ...info, arrivals: arrivals.slice(0, 3), isLoading: false }
                : info
            ));
          })
          .catch(() => {
            setTransitInfos(prev => prev.map((info, i) =>
              i === subwayCount + idx ? { ...info, isLoading: false, error: '조회 실패' } : info
            ));
          })
      );
    });

    await Promise.allSettled(promises);
  }, []);

  useEffect(() => {
    if (activeRoute) {
      loadTransitArrivals(activeRoute);
    }
  }, [activeRoute, loadTransitArrivals]);

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
    alerts,
    nextAlert,
    commuteStats,
    isCommuteStarting,
    handleStartCommute,
    navigate,
  };
}
