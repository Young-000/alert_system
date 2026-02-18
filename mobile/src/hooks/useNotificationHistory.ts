import { useCallback, useEffect, useState } from 'react';

import { notificationService } from '@/services/notification.service';
import { useAuth } from './useAuth';

import type { NotificationLog, NotificationStatsDto } from '@/types/notification';

type UseNotificationHistoryReturn = {
  items: NotificationLog[];
  stats: NotificationStatsDto | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useNotificationHistory(): UseNotificationHistoryReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const [historyResult, statsResult] = await Promise.allSettled([
        notificationService.fetchHistory(20, 0),
        notificationService.fetchStats(),
      ]);

      // History failure is critical
      if (historyResult.status === 'rejected') {
        setError('알림 기록을 불러올 수 없어요');
        return;
      }

      setItems(historyResult.value.items);
      setError(null);

      // Stats failure is non-critical (graceful degradation)
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else {
        setStats(null);
      }
    } catch {
      setError('알림 기록을 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchData().finally(() => setIsLoading(false));
  }, [user, fetchData]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  return {
    items,
    stats,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
