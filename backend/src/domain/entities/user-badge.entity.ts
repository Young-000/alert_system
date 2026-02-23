import { v4 as uuidv4 } from 'uuid';

type UserBadgeOptions = {
  id?: string;
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  challengeId: string;
  earnedAt?: Date;
  createdAt?: Date;
};

export class UserBadge {
  readonly id: string;
  readonly userId: string;
  readonly badgeId: string;
  readonly badgeName: string;
  readonly badgeEmoji: string;
  readonly challengeId: string;
  readonly earnedAt: Date;
  readonly createdAt: Date;

  constructor(options: UserBadgeOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.badgeId = options.badgeId;
    this.badgeName = options.badgeName;
    this.badgeEmoji = options.badgeEmoji;
    this.challengeId = options.challengeId;
    this.earnedAt = options.earnedAt ?? new Date();
    this.createdAt = options.createdAt ?? new Date();
  }

  static create(
    userId: string,
    badgeId: string,
    badgeName: string,
    badgeEmoji: string,
    challengeId: string,
  ): UserBadge {
    if (!userId || userId.trim() === '') {
      throw new Error('userId is required');
    }
    if (!badgeId || badgeId.trim() === '') {
      throw new Error('badgeId is required');
    }
    if (!challengeId || challengeId.trim() === '') {
      throw new Error('challengeId is required');
    }

    return new UserBadge({
      userId,
      badgeId,
      badgeName,
      badgeEmoji,
      challengeId,
    });
  }
}
