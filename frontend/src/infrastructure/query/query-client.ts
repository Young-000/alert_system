import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logError } from '@infrastructure/monitoring/error-logger';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError(error, 'query', 'medium', {
        type: 'query',
        queryKey: JSON.stringify(query.queryKey),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      logError(error, 'query', 'medium', { type: 'mutation' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5분 — 대부분의 데이터에 적합
      gcTime: 30 * 60 * 1000,           // 30분 — 가비지 컬렉션 (구 cacheTime)
      retry: 1,                          // 1회 재시도 (기존 api-client의 2회 retry와 중복 방지)
      refetchOnWindowFocus: true,        // 탭 복귀 시 stale 데이터 자동 갱신
      refetchOnReconnect: true,          // 네트워크 복구 시 갱신
      refetchOnMount: true,              // 마운트 시 stale이면 갱신
    },
  },
});
