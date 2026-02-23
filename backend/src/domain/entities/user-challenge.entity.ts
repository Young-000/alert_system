import { v4 as uuidv4 } from 'uuid';

export type UserChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned';

type UserChallengeOptions = {
  id?: string;
  userId: string;
  challengeTemplateId: string;
  status?: UserChallengeStatus;
  startedAt?: Date;
  deadlineAt: Date;
  completedAt?: Date | null;
  currentProgress?: number;
  targetProgress: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class UserChallenge {
  readonly id: string;
  readonly userId: string;
  readonly challengeTemplateId: string;
  readonly status: UserChallengeStatus;
  readonly startedAt: Date;
  readonly deadlineAt: Date;
  readonly completedAt: Date | null;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(options: UserChallengeOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.challengeTemplateId = options.challengeTemplateId;
    this.status = options.status ?? 'active';
    this.startedAt = options.startedAt ?? new Date();
    this.deadlineAt = options.deadlineAt;
    this.completedAt = options.completedAt ?? null;
    this.currentProgress = options.currentProgress ?? 0;
    this.targetProgress = options.targetProgress;
    this.createdAt = options.createdAt ?? new Date();
    this.updatedAt = options.updatedAt ?? new Date();
  }

  static create(
    userId: string,
    templateId: string,
    targetProgress: number,
    durationDays: number,
  ): UserChallenge {
    if (!userId || userId.trim() === '') {
      throw new Error('userId is required');
    }
    if (!templateId || templateId.trim() === '') {
      throw new Error('templateId is required');
    }
    if (targetProgress <= 0) {
      throw new Error('targetProgress must be greater than 0');
    }
    if (durationDays <= 0) {
      throw new Error('durationDays must be greater than 0');
    }

    const now = new Date();
    const deadlineAt = new Date(now);
    deadlineAt.setDate(deadlineAt.getDate() + durationDays);

    return new UserChallenge({
      userId,
      challengeTemplateId: templateId,
      status: 'active',
      startedAt: now,
      deadlineAt,
      completedAt: null,
      currentProgress: 0,
      targetProgress,
      createdAt: now,
      updatedAt: now,
    });
  }

  incrementProgress(): UserChallenge {
    if (this.status !== 'active') {
      throw new Error(`Cannot increment progress on ${this.status} challenge`);
    }

    const newProgress = this.currentProgress + 1;
    const isCompleted = newProgress >= this.targetProgress;
    const now = new Date();

    return new UserChallenge({
      id: this.id,
      userId: this.userId,
      challengeTemplateId: this.challengeTemplateId,
      status: isCompleted ? 'completed' : 'active',
      startedAt: this.startedAt,
      deadlineAt: this.deadlineAt,
      completedAt: isCompleted ? now : null,
      currentProgress: newProgress,
      targetProgress: this.targetProgress,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }

  abandon(): UserChallenge {
    if (this.status !== 'active') {
      throw new Error(`Cannot abandon ${this.status} challenge`);
    }

    return new UserChallenge({
      id: this.id,
      userId: this.userId,
      challengeTemplateId: this.challengeTemplateId,
      status: 'abandoned',
      startedAt: this.startedAt,
      deadlineAt: this.deadlineAt,
      completedAt: null,
      currentProgress: this.currentProgress,
      targetProgress: this.targetProgress,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  checkExpiry(now: Date): UserChallenge {
    if (this.status !== 'active') {
      return this;
    }
    if (this.deadlineAt >= now) {
      return this;
    }

    return new UserChallenge({
      id: this.id,
      userId: this.userId,
      challengeTemplateId: this.challengeTemplateId,
      status: 'failed',
      startedAt: this.startedAt,
      deadlineAt: this.deadlineAt,
      completedAt: null,
      currentProgress: this.currentProgress,
      targetProgress: this.targetProgress,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }

  get progressPercent(): number {
    if (this.targetProgress === 0) return 0;
    return Math.round((this.currentProgress / this.targetProgress) * 100);
  }

  get daysRemaining(): number {
    const now = new Date();
    const diff = this.deadlineAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get isCloseToCompletion(): boolean {
    return this.targetProgress - this.currentProgress === 1;
  }
}
