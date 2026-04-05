import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';

export interface ChallengeRepository {
  // Templates
  findAllTemplates(): Promise<ChallengeTemplate[]>;
  findTemplateById(id: string): Promise<ChallengeTemplate | null>;
  findTemplatesByIds(ids: string[]): Promise<ChallengeTemplate[]>;

  // User Challenges
  findActiveChallengesByUserId(userId: string): Promise<UserChallenge[]>;
  findChallengeById(id: string): Promise<UserChallenge | null>;
  findActiveByUserAndTemplate(
    userId: string,
    templateId: string,
  ): Promise<UserChallenge | null>;
  countActiveChallenges(userId: string): Promise<number>;
  findChallengeHistory(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ challenges: UserChallenge[]; totalCount: number }>;
  saveChallenge(challenge: UserChallenge): Promise<UserChallenge>;

  // Badges
  findBadgesByUserId(userId: string): Promise<UserBadge[]>;
  findBadgeByUserAndBadgeId(
    userId: string,
    badgeId: string,
  ): Promise<UserBadge | null>;
  saveBadge(badge: UserBadge): Promise<UserBadge>;
  countTotalBadges(): Promise<number>;
}
