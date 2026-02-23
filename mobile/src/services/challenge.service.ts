import { apiClient } from './api-client';

import type {
  AbandonChallengeResponse,
  ActiveChallengesResponse,
  BadgesResponse,
  ChallengeHistoryResponse,
  JoinChallengeResponse,
  TemplatesResponse,
} from '@/types/challenge';

export const challengeService = {
  async getTemplates(): Promise<TemplatesResponse> {
    return apiClient.get<TemplatesResponse>('/challenges/templates');
  },

  async joinChallenge(templateId: string): Promise<JoinChallengeResponse> {
    return apiClient.post<JoinChallengeResponse, { templateId: string }>(
      '/challenges/join',
      { templateId },
    );
  },

  async getActiveChallenges(): Promise<ActiveChallengesResponse> {
    return apiClient.get<ActiveChallengesResponse>('/challenges/active');
  },

  async abandonChallenge(challengeId: string): Promise<AbandonChallengeResponse> {
    return apiClient.post<AbandonChallengeResponse>(
      `/challenges/${challengeId}/abandon`,
    );
  },

  async getChallengeHistory(
    limit = 20,
    offset = 0,
  ): Promise<ChallengeHistoryResponse> {
    return apiClient.get<ChallengeHistoryResponse>(
      `/challenges/history?limit=${limit}&offset=${offset}`,
    );
  },

  async getBadges(): Promise<BadgesResponse> {
    return apiClient.get<BadgesResponse>('/challenges/badges');
  },
};
