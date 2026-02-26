import { useQuery } from '@tanstack/react-query';
import {
  getCommuteApiClient,
  type CommuteStatsResponse,
  type AnalyticsSummaryResponse,
} from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useCommuteMonthlyStatsQuery(userId: string) {
  return useQuery<CommuteStatsResponse>({
    queryKey: queryKeys.commuteStats.byUser(userId, 30),
    queryFn: () => getCommuteApiClient().getStats(userId, 30),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAnalyticsSummaryQuery(userId: string) {
  return useQuery<AnalyticsSummaryResponse>({
    queryKey: queryKeys.analyticsSummary.byUser(userId),
    queryFn: () => getCommuteApiClient().getAnalyticsSummary(userId),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
