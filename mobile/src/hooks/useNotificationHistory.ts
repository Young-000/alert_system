import { useCallback, useEffect, useState } from 'react';

import { notificationService } from '@/services/notification.service';
import { useAuth } from './useAuth';

import type { NotificationLog, NotificationStatsDto } from '@/types/notification';

export const STATS_LOAD_FAILED = '발송 통계를 불러올 수 없어요';

type UseNotificationHistoryReturn = {
  items: NotificationLog[];
  stats: NotificationStatsDto | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  /** 발송 통계만 실패했을 때의 사유. 기록 실패는 `error`가 따로 든다. */
  statsError: string | null;
  refresh: () => Promise<void>;
};

export function useNotificationHistory(): UseNotificationHistoryReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

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

      // 통계 실패는 기록 조회를 막지 않는다. 다만 조용히 비우지는 않는다 —
      // `NotificationStatsSummary`는 stats가 null이면 아무것도 그리지 않아서,
      // 실패한 화면과 "발송된 알림이 0건인 화면"이 똑같아진다. 이 앱의 다른
      // 보조 조회도 실패를 알린다(`home-load-error.ts`가 기록 실패를 문구로 옮긴다).
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
        setStatsError(null);
      } else {
        setStats(null);
        setStatsError(STATS_LOAD_FAILED);
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
    statsError,
    refresh,
  };
}
