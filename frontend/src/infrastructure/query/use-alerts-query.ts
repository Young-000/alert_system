import { useQuery } from '@tanstack/react-query';
import { alertApiClient } from '@infrastructure/api';
import type { Alert } from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useAlertsQuery(userId: string) {
  return useQuery<Alert[]>({
    queryKey: queryKeys.alerts.byUser(userId),
    queryFn: () => alertApiClient.getAlertsByUser(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,  // 2분 — 알림은 자주 변경될 수 있음
  });
}
