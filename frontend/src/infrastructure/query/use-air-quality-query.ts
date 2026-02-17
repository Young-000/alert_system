import { useQuery } from '@tanstack/react-query';
import { airQualityApiClient } from '@infrastructure/api';
import type { AirQualityData } from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useAirQualityQuery(lat: number, lng: number, enabled: boolean) {
  return useQuery<AirQualityData>({
    queryKey: queryKeys.airQuality.byLocation(lat, lng),
    queryFn: () => airQualityApiClient.getByLocation(lat, lng),
    enabled,
    staleTime: 10 * 60 * 1000,      // 10분 — 미세먼지는 시간 단위 변동
    refetchOnWindowFocus: true,
  });
}
