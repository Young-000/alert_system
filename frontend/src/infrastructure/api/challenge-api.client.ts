import type { ApiClient } from './api-client';

// ─── Types ───────────────────────────────────────────

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface ChallengeTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  targetValue: number;
  conditionType: string;
  conditionValue: number;
  durationDays: number;
  difficulty: ChallengeDifficulty;
  badgeEmoji: string;
  badgeName: string;
  isJoined: boolean;
  isCompleted: boolean;
}

export interface ChallengeCategory {
  key: string;
  label: string;
  emoji: string;
}

export interface TemplatesResponse {
  templates: ChallengeTemplate[];
  categories: ChallengeCategory[];
}

export interface ChallengeTemplateInfo {
  id: string;
  category: string;
  name: string;
  description: string;
  badgeEmoji: string;
  badgeName: string;
  difficulty: string;
}

export interface ActiveChallenge {
  id: string;
  template: ChallengeTemplateInfo;
  status: string;
  startedAt: string;
  deadlineAt: string;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  daysRemaining: number;
  isCloseToCompletion: boolean;
}

export interface ActiveChallengesResponse {
  challenges: ActiveChallenge[];
}

export interface JoinChallengeResponse {
  id: string;
  templateId: string;
  status: string;
  startedAt: string;
  deadlineAt: string;
  currentProgress: number;
  targetProgress: number;
}

export interface ChallengeHistoryResponse {
  challenges: ActiveChallenge[];
  totalCount: number;
  stats: {
    totalCompleted: number;
    totalFailed: number;
    totalAbandoned: number;
    completionRate: number;
  };
}

export interface Badge {
  id: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  challengeId: string;
  earnedAt: string;
}

export interface BadgesResponse {
  badges: Badge[];
  totalBadges: number;
  earnedCount: number;
}

// ─── API Client ──────────────────────────────────────

export class ChallengeApiClient {
  constructor(private apiClient: ApiClient) {}

  async getTemplates(): Promise<TemplatesResponse> {
    return this.apiClient.get<TemplatesResponse>('/challenges/templates');
  }

  async getActiveChallenges(): Promise<ActiveChallengesResponse> {
    return this.apiClient.get<ActiveChallengesResponse>('/challenges/active');
  }

  async joinChallenge(templateId: string): Promise<JoinChallengeResponse> {
    return this.apiClient.post<JoinChallengeResponse>('/challenges/join', { templateId });
  }

  async abandonChallenge(challengeId: string): Promise<{ success: boolean }> {
    return this.apiClient.post<{ success: boolean }>(`/challenges/${challengeId}/abandon`);
  }

  async getHistory(limit = 20, offset = 0): Promise<ChallengeHistoryResponse> {
    return this.apiClient.get<ChallengeHistoryResponse>(
      `/challenges/history?limit=${limit}&offset=${offset}`,
    );
  }

  async getBadges(): Promise<BadgesResponse> {
    return this.apiClient.get<BadgesResponse>('/challenges/badges');
  }
}
