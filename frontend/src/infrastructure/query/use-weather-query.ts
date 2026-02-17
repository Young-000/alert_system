import { useQuery } from '@tanstack/react-query';
import { weatherApiClient } from '@infrastructure/api';
import type { WeatherData } from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useWeatherQuery(lat: number, lng: number, enabled: boolean) {
  return useQuery<WeatherData>({
    queryKey: queryKeys.weather.current(lat, lng),
    queryFn: () => weatherApiClient.getCurrentWeather(lat, lng),
    enabled,
    staleTime: 10 * 60 * 1000,      // 10분 — 날씨는 분 단위로 급변하지 않음
    refetchOnWindowFocus: true,       // 탭 복귀 시 최신 날씨 반영
  });
}
