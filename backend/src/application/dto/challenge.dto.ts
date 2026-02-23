import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallengeStatus } from '@domain/entities/user-challenge.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';

export const MAX_ACTIVE_CHALLENGES = 3;

// --- EvaluateChallengeUseCase types ---

export type SessionCompletionData = {
  totalDurationMinutes?: number;
  currentStreak?: number;
  weeklySessionCount?: number;
  weekdaySessionsThisWeek?: number[];
};

export type ChallengeUpdate = {
  challengeId: string;
  challengeName: string;
  previousProgress: number;
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  isCloseToCompletion: boolean;
  badgeEarned: {
    badgeId: string;
    badgeName: string;
    badgeEmoji: string;
  } | null;
};

// --- ManageChallengeUseCase types ---

export type TemplateWithStatus = {
  template: ChallengeTemplate;
  isJoined: boolean;
  isCompleted: boolean;
};

export type ActiveChallengeDetail = {
  id: string;
  template: ChallengeTemplate;
  status: UserChallengeStatus;
  startedAt: Date;
  deadlineAt: Date;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  daysRemaining: number;
  isCloseToCompletion: boolean;
};

export type ChallengeHistoryResult = {
  challenges: ActiveChallengeDetail[];
  totalCount: number;
  stats: {
    totalCompleted: number;
    totalFailed: number;
    totalAbandoned: number;
    completionRate: number;
  };
};

export type BadgeCollectionResult = {
  badges: UserBadge[];
  totalBadges: number;
  earnedCount: number;
};
