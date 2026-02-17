import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type CommuteStatsResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useCommuteStatsQuery(userId: string, days: number) {
  return useQuery<CommuteStatsResponse>({
    queryKey: queryKeys.commuteStats.byUser(userId, days),
    queryFn: () => getCommuteApiClient().getStats(userId, days),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,      // 15분 — 통계는 트래킹 완료 후에만 변함
    refetchOnWindowFocus: false,      // 통계는 포커스 갱신 불필요
  });
}
