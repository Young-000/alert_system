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
    // 엔드포인트는 구현돼 있다(GET commute/streak/:userId). 재시도를 끄는 대신
    // 실패를 홈에서 문구로 알리고 '다시 시도'로 사용자가 직접 부른다.
    retry: false,
  });
}
