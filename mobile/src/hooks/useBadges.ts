import { useCallback, useEffect, useState } from 'react';

import { challengeService } from '@/services/challenge.service';
import { useAuth } from './useAuth';

import type { Badge } from '@/types/challenge';

type UseBadgesReturn = {
  badges: Badge[];
  totalBadges: number;
  earnedCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useBadges(): UseBadgesReturn {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [earnedCount, setEarnedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await challengeService.getBadges();
      setBadges(data.badges);
      setTotalBadges(data.totalBadges);
      setEarnedCount(data.earnedCount);
      setError(null);
    } catch {
      setError('배지를 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchBadges().finally(() => setIsLoading(false));
  }, [user, fetchBadges]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchBadges();
    setIsRefreshing(false);
  }, [fetchBadges]);

  return {
    badges,
    totalBadges,
    earnedCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
