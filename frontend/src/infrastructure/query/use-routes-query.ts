import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useRoutesQuery(userId: string) {
  return useQuery<RouteResponse[]>({
    queryKey: queryKeys.routes.byUser(userId),
    queryFn: () => getCommuteApiClient().getUserRoutes(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,      // 10분 — 경로는 자주 변경되지 않음
    refetchOnWindowFocus: false,      // 경로 변경은 드물어 포커스 갱신 불필요
  });
}
