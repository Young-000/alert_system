import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type DelayStatusResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useRouteDelayStatus(routeId: string | undefined) {
  return useQuery<DelayStatusResponse>({
    queryKey: queryKeys.delayStatus.byRoute(routeId ?? ''),
    queryFn: () => getCommuteApiClient().getRouteDelayStatus(routeId!),
    enabled: !!routeId,
    staleTime: 30 * 1000,          // 30초 — 실시간 데이터
    refetchInterval: 60 * 1000,    // 1분마다 자동 갱신
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
