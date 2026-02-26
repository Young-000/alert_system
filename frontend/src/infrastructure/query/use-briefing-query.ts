import { useQuery } from '@tanstack/react-query';
import { briefingApiClient } from '@infrastructure/api';
import type { BriefingResponse } from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useBriefingQuery(lat: number, lng: number, enabled: boolean) {
  return useQuery<BriefingResponse>({
    queryKey: queryKeys.briefing.byLocation(lat, lng),
    queryFn: () => briefingApiClient.getBriefing(lat, lng),
    enabled,
    staleTime: 10 * 60 * 1000,      // 10min — same cadence as weather
    refetchOnWindowFocus: true,
    retry: 1,                         // graceful fallback on backend unavailability
  });
}
