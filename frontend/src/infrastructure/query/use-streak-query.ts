import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type StreakResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useStreakQuery(userId: string) {
  return useQuery<StreakResponse>({
    queryKey: queryKeys.streak.byUser(userId),
    queryFn: () => getCommuteApiClient().getStreak(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,        // 5분 — 세션 완료 시 invalidate
    refetchOnWindowFocus: true,       // 앱 복귀 시 최신 상태 확인
    retry: false,                     // 404(미구현 엔드포인트) 재시도 방지
  });
}
