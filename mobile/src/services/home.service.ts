import { apiClient } from './api-client';

import type {
  AirQualityData,
  Alert,
  BusArrival,
  CommuteStatsResponse,
  RouteResponse,
  SubwayArrival,
  WeatherData,
  WidgetDataResponse,
} from '@/types/home';

/** Fetches current weather data for given coordinates. */
export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData> {
  return apiClient.get<WeatherData>(
    `/weather/current?lat=${lat}&lng=${lng}`,
  );
}

/** Fetches air quality data for given coordinates. */
export async function fetchAirQuality(
  lat: number,
  lng: number,
): Promise<AirQualityData> {
  return apiClient.get<AirQualityData>(
    `/air-quality/location?lat=${lat}&lng=${lng}`,
  );
}

/** Fetches user's saved routes. */
export async function fetchRoutes(userId: string): Promise<RouteResponse[]> {
  return apiClient.get<RouteResponse[]>(`/routes/user/${userId}`);
}

/** Fetches real-time subway arrival info for a station. */
export async function fetchSubwayArrival(
  stationName: string,
): Promise<SubwayArrival[]> {
  return apiClient.get<SubwayArrival[]>(
    `/subway/arrival/${encodeURIComponent(stationName)}`,
  );
}

/** Fetches real-time bus arrival info for a stop. */
export async function fetchBusArrival(stopId: string): Promise<BusArrival[]> {
  return apiClient.get<BusArrival[]>(`/bus/arrival/${stopId}`);
}

/** Fetches user's alert list. */
export async function fetchAlerts(userId: string): Promise<Alert[]> {
  return apiClient.get<Alert[]>(`/alerts/user/${userId}`);
}

/** Fetches commute statistics for a user. */
export async function fetchCommuteStats(
  userId: string,
  days: number = 7,
): Promise<CommuteStatsResponse> {
  return apiClient.get<CommuteStatsResponse>(
    `/commute/stats/${userId}?days=${days}`,
  );
}

/** Fetches aggregated widget data (weather + AQI + alert + transit). */
export async function fetchWidgetData(
  lat: number = 37.5665,
  lng: number = 126.9780,
): Promise<WidgetDataResponse> {
  return apiClient.get<WidgetDataResponse>(
    `/widget/data?lat=${lat}&lng=${lng}`,
  );
}
