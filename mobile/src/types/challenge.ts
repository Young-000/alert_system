// ─── Challenge Types ──────────────────────────────

export type ChallengeCategory = 'time_goal' | 'streak' | 'weekly_frequency';

export type ConditionType =
  | 'duration_under'
  | 'consecutive_days'
  | 'weekly_count'
  | 'weekday_complete';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned';

// ─── Template ────────────────────────────────────

export type ChallengeTemplate = {
  id: string;
  category: ChallengeCategory;
  name: string;
  description: string;
  targetValue: number;
  conditionType: ConditionType;
  conditionValue: number;
  durationDays: number;
  difficulty: ChallengeDifficulty;
  badgeEmoji: string;
  badgeName: string;
  isJoined: boolean;
  isCompleted: boolean;
};

export type TemplateCategory = {
  key: string;
  label: string;
  emoji: string;
};

export type TemplatesResponse = {
  templates: ChallengeTemplate[];
  categories: TemplateCategory[];
};

// ─── Active / History Challenge ──────────────────

export type ChallengeTemplateInfo = {
  id: string;
  category: ChallengeCategory;
  name: string;
  description: string;
  badgeEmoji: string;
  badgeName: string;
  difficulty: ChallengeDifficulty;
};

export type Challenge = {
  id: string;
  template: ChallengeTemplateInfo;
  status: ChallengeStatus;
  startedAt: string;
  deadlineAt: string;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  daysRemaining: number;
  isCloseToCompletion: boolean;
};

export type ActiveChallengesResponse = {
  challenges: Challenge[];
};

// ─── Join ────────────────────────────────────────

export type JoinChallengeResponse = {
  id: string;
  templateId: string;
  status: ChallengeStatus;
  startedAt: string;
  deadlineAt: string;
  currentProgress: number;
  targetProgress: number;
};

// ─── Abandon ─────────────────────────────────────

export type AbandonChallengeResponse = {
  success: boolean;
};

// ─── History ─────────────────────────────────────

export type ChallengeStats = {
  totalCompleted: number;
  totalFailed: number;
  totalAbandoned: number;
  completionRate: number;
};

export type ChallengeHistoryResponse = {
  challenges: Challenge[];
  totalCount: number;
  stats: ChallengeStats;
};

// ─── Badges ──────────────────────────────────────

export type Badge = {
  id: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  challengeId: string;
  earnedAt: string;
};

export type BadgesResponse = {
  badges: Badge[];
  totalBadges: number;
  earnedCount: number;
};
