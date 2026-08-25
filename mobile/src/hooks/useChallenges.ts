import { useCallback, useEffect, useState } from 'react';

import { challengeService } from '@/services/challenge.service';
import { serverMessage } from '@/utils/api-error';
import { useAuth } from './useAuth';

import type { Challenge, ChallengeTemplate, TemplateCategory } from '@/types/challenge';

/**
 * 참가 결과. 실패하면 사유를 반드시 들고 온다.
 *
 * 서버는 참가 상한(최대 3개)과 중복 참가를 **서로 다른 문구의 409**로 구분한다
 * (`manage-challenge.use-case.ts:50-64`). 성패만 boolean으로 돌려주면 그 구분이
 * 호출부에 닿지 못해, 상한에 걸린 사용자가 이유를 모른 채 계속 다시 누른다.
 */
export type JoinChallengeResult =
  | { joined: true }
  | { joined: false; message: string };

type UseChallengesReturn = {
  templates: ChallengeTemplate[];
  categories: TemplateCategory[];
  activeChallenges: Challenge[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  joinChallenge: (templateId: string) => Promise<JoinChallengeResult>;
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
    async (templateId: string): Promise<JoinChallengeResult> => {
      if (!user) return { joined: false, message: '로그인이 필요해요.' };

      try {
        await challengeService.joinChallenge(templateId);
        await fetchAll();
        return { joined: true };
      } catch (err) {
        // 서버 문구가 곧 사용자가 할 수 있는 다음 행동이다 ("최대 3개" → 하나 포기).
        // 꺼낼 수 없을 때(네트워크 단절 등)만 이 화면의 기본 문구로 떨어진다.
        return {
          joined: false,
          message: serverMessage(err) ?? '도전에 참가하지 못했어요. 잠시 후 다시 시도해주세요.',
        };
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
