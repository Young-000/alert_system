export type ChallengeCategory = 'time_goal' | 'streak' | 'weekly_frequency';
export type ConditionType =
  | 'duration_under'
  | 'consecutive_days'
  | 'weekly_count'
  | 'weekday_complete';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

type ChallengeTemplateOptions = {
  id: string;
  category: ChallengeCategory;
  name: string;
  description: string;
  targetValue: number;
  conditionType: ConditionType;
  conditionValue: number;
  durationDays: number;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  difficulty: ChallengeDifficulty;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: Date;
};

export class ChallengeTemplate {
  readonly id: string;
  readonly category: ChallengeCategory;
  readonly name: string;
  readonly description: string;
  readonly targetValue: number;
  readonly conditionType: ConditionType;
  readonly conditionValue: number;
  readonly durationDays: number;
  readonly badgeId: string;
  readonly badgeName: string;
  readonly badgeEmoji: string;
  readonly difficulty: ChallengeDifficulty;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly createdAt: Date;

  constructor(options: ChallengeTemplateOptions) {
    this.id = options.id;
    this.category = options.category;
    this.name = options.name;
    this.description = options.description;
    this.targetValue = options.targetValue;
    this.conditionType = options.conditionType;
    this.conditionValue = options.conditionValue;
    this.durationDays = options.durationDays;
    this.badgeId = options.badgeId;
    this.badgeName = options.badgeName;
    this.badgeEmoji = options.badgeEmoji;
    this.difficulty = options.difficulty;
    this.sortOrder = options.sortOrder ?? 0;
    this.isActive = options.isActive ?? true;
    this.createdAt = options.createdAt ?? new Date();
  }

  static create(options: ChallengeTemplateOptions): ChallengeTemplate {
    if (!options.name || options.name.trim() === '') {
      throw new Error('name is required');
    }
    if (options.targetValue <= 0) {
      throw new Error('targetValue must be greater than 0');
    }
    if (options.durationDays <= 0) {
      throw new Error('durationDays must be greater than 0');
    }

    return new ChallengeTemplate(options);
  }
}
