import { useCallback, useEffect, useState } from 'react';

import { challengeService } from '@/services/challenge.service';
import { useAuth } from './useAuth';

import type { Challenge, ChallengeTemplate, TemplateCategory } from '@/types/challenge';

type UseChallengesReturn = {
  templates: ChallengeTemplate[];
  categories: TemplateCategory[];
  activeChallenges: Challenge[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  joinChallenge: (templateId: string) => Promise<boolean>;
  abandonChallenge: (challengeId: string) => Promise<boolean>;
};

export function useChallenges(): UseChallengesReturn {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await challengeService.getTemplates();
      setTemplates(data.templates);
      setCategories(data.categories);
    } catch {
      setError('챌린지 템플릿을 불러올 수 없어요');
    }
  }, [user]);

  const fetchActiveChallenges = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await challengeService.getActiveChallenges();
      setActiveChallenges(data.challenges);
    } catch {
      setError('진행 중인 챌린지를 불러올 수 없어요');
    }
  }, [user]);

  const fetchAll = useCallback(async (): Promise<void> => {
    setError(null);
    await Promise.all([fetchTemplates(), fetchActiveChallenges()]);
  }, [fetchTemplates, fetchActiveChallenges]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchAll().finally(() => setIsLoading(false));
  }, [user, fetchAll]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }, [fetchAll]);

  // Join
  const joinChallenge = useCallback(
    async (templateId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        await challengeService.joinChallenge(templateId);
        await fetchAll();
        return true;
      } catch {
        return false;
      }
    },
    [user, fetchAll],
  );

  // Abandon (optimistic update)
  const abandonChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      const previous = activeChallenges;
      setActiveChallenges((prev) => prev.filter((c) => c.id !== challengeId));

      try {
        await challengeService.abandonChallenge(challengeId);
        await fetchAll();
        return true;
      } catch {
        setActiveChallenges(previous);
        return false;
      }
    },
    [activeChallenges, fetchAll],
  );

  return {
    templates,
    categories,
    activeChallenges,
    isLoading,
    isRefreshing,
    error,
    refresh,
    joinChallenge,
    abandonChallenge,
  };
}
