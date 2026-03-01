import { useQuery } from '@tanstack/react-query';
import {
  getCommuteApiClient,
  type TimeSlot,
  type CongestionSegmentsResponse,
  type RouteCongestionResponse,
} from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useCongestionSegments(timeSlot?: TimeSlot) {
  return useQuery<CongestionSegmentsResponse>({
    queryKey: queryKeys.congestion.segments(timeSlot),
    queryFn: () => getCommuteApiClient().getCongestionSegments(timeSlot),
    staleTime: 5 * 60 * 1000,       // 5 minutes
    retry: 1,
  });
}

export function useRouteCongestion(
  routeId: string | undefined,
  timeSlot?: TimeSlot,
) {
  return useQuery<RouteCongestionResponse>({
    queryKey: queryKeys.congestion.byRoute(routeId ?? '', timeSlot),
    queryFn: () => getCommuteApiClient().getRouteCongestion(routeId!, timeSlot),
    enabled: !!routeId,
    staleTime: 5 * 60 * 1000,       // 5 minutes
    retry: 1,
  });
}
