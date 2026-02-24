import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  challengeApiClient,
  type TemplatesResponse,
  type ActiveChallengesResponse,
  type BadgesResponse,
  type JoinChallengeResponse,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useChallengeTemplatesQuery(enabled = true) {
  return useQuery<TemplatesResponse>({
    queryKey: queryKeys.challenges.templates,
    queryFn: () => challengeApiClient.getTemplates(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveChallengesQuery(enabled = true) {
  return useQuery<ActiveChallengesResponse>({
    queryKey: queryKeys.challenges.active,
    queryFn: () => challengeApiClient.getActiveChallenges(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBadgesQuery(enabled = true) {
  return useQuery<BadgesResponse>({
    queryKey: queryKeys.challenges.badges,
    queryFn: () => challengeApiClient.getBadges(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJoinChallengeMutation() {
  const queryClient = useQueryClient();

  return useMutation<JoinChallengeResponse, Error, string>({
    mutationFn: (templateId: string) => challengeApiClient.joinChallenge(templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.challenges.all });
    },
  });
}

export function useAbandonChallengeMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (challengeId: string) => challengeApiClient.abandonChallenge(challengeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.challenges.all });
    },
  });
}
