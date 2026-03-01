import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeRepository } from '@domain/repositories/challenge.repository';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';
import { ChallengeTemplateEntity } from './challenge-template.entity';
import { UserChallengeEntity } from './user-challenge.entity';
import { UserBadgeEntity } from './user-badge.entity';

@Injectable()
export class TypeormChallengeRepository implements ChallengeRepository {
  constructor(
    @InjectRepository(ChallengeTemplateEntity)
    private readonly templateRepo: Repository<ChallengeTemplateEntity>,
    @InjectRepository(UserChallengeEntity)
    private readonly challengeRepo: Repository<UserChallengeEntity>,
    @InjectRepository(UserBadgeEntity)
    private readonly badgeRepo: Repository<UserBadgeEntity>,
  ) {}

  // --- Templates ---

  async findAllTemplates(): Promise<ChallengeTemplate[]> {
    const entities = await this.templateRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return entities.map((e) => this.templateToDomain(e));
  }

  async findTemplateById(id: string): Promise<ChallengeTemplate | null> {
    const entity = await this.templateRepo.findOneBy({ id });
    return entity ? this.templateToDomain(entity) : null;
  }

  async findTemplatesByIds(ids: string[]): Promise<Map<string, ChallengeTemplate>> {
    if (ids.length === 0) return new Map();
    const entities = await this.templateRepo
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids })
      .getMany();
    const map = new Map<string, ChallengeTemplate>();
    for (const entity of entities) {
      map.set(entity.id, this.templateToDomain(entity));
    }
    return map;
  }

  // --- User Challenges ---

  async findActiveChallengesByUserId(userId: string): Promise<UserChallenge[]> {
    const entities = await this.challengeRepo.find({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.challengeToDomain(e));
  }

  async findChallengeById(id: string): Promise<UserChallenge | null> {
    const entity = await this.challengeRepo.findOneBy({ id });
    return entity ? this.challengeToDomain(entity) : null;
  }

  async findActiveByUserAndTemplate(
    userId: string,
    templateId: string,
  ): Promise<UserChallenge | null> {
    const entity = await this.challengeRepo.findOneBy({
      userId,
      challengeTemplateId: templateId,
      status: 'active',
    });
    return entity ? this.challengeToDomain(entity) : null;
  }

  async countActiveChallenges(userId: string): Promise<number> {
    return this.challengeRepo.count({
      where: { userId, status: 'active' },
    });
  }

  async findChallengeHistory(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ challenges: UserChallenge[]; totalCount: number }> {
    const [entities, totalCount] = await this.challengeRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return {
      challenges: entities.map((e) => this.challengeToDomain(e)),
      totalCount,
    };
  }

  async saveChallenge(challenge: UserChallenge): Promise<UserChallenge> {
    const entity = this.challengeToEntity(challenge);
    const saved = await this.challengeRepo.save(entity);
    return this.challengeToDomain(saved);
  }

  // --- Badges ---

  async findBadgesByUserId(userId: string): Promise<UserBadge[]> {
    const entities = await this.badgeRepo.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });
    return entities.map((e) => this.badgeToDomain(e));
  }

  async findBadgeByUserAndBadgeId(
    userId: string,
    badgeId: string,
  ): Promise<UserBadge | null> {
    const entity = await this.badgeRepo.findOneBy({ userId, badgeId });
    return entity ? this.badgeToDomain(entity) : null;
  }

  async saveBadge(badge: UserBadge): Promise<UserBadge> {
    const entity = this.badgeToEntity(badge);
    const saved = await this.badgeRepo.save(entity);
    return this.badgeToDomain(saved);
  }

  async countTotalBadges(): Promise<number> {
    const result = await this.templateRepo
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.badge_id)', 'count')
      .where('t.is_active = :active', { active: true })
      .getRawOne();
    return parseInt(result?.count ?? '0', 10);
  }

  // --- Mappers ---

  private templateToDomain(entity: ChallengeTemplateEntity): ChallengeTemplate {
    return new ChallengeTemplate({
      id: entity.id,
      category: entity.category as ChallengeTemplate['category'],
      name: entity.name,
      description: entity.description,
      targetValue: entity.targetValue,
      conditionType: entity.conditionType as ChallengeTemplate['conditionType'],
      conditionValue: entity.conditionValue,
      durationDays: entity.durationDays,
      badgeId: entity.badgeId,
      badgeName: entity.badgeName,
      badgeEmoji: entity.badgeEmoji,
      difficulty: entity.difficulty as ChallengeTemplate['difficulty'],
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    });
  }

  private challengeToDomain(entity: UserChallengeEntity): UserChallenge {
    return new UserChallenge({
      id: entity.id,
      userId: entity.userId,
      challengeTemplateId: entity.challengeTemplateId,
      status: entity.status as UserChallenge['status'],
      startedAt: entity.startedAt,
      deadlineAt: entity.deadlineAt,
      completedAt: entity.completedAt,
      currentProgress: entity.currentProgress,
      targetProgress: entity.targetProgress,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private challengeToEntity(challenge: UserChallenge): Partial<UserChallengeEntity> {
    return {
      id: challenge.id,
      userId: challenge.userId,
      challengeTemplateId: challenge.challengeTemplateId,
      status: challenge.status,
      startedAt: challenge.startedAt,
      deadlineAt: challenge.deadlineAt,
      completedAt: challenge.completedAt,
      currentProgress: challenge.currentProgress,
      targetProgress: challenge.targetProgress,
    };
  }

  private badgeToDomain(entity: UserBadgeEntity): UserBadge {
    return new UserBadge({
      id: entity.id,
      userId: entity.userId,
      badgeId: entity.badgeId,
      badgeName: entity.badgeName,
      badgeEmoji: entity.badgeEmoji,
      challengeId: entity.challengeId,
      earnedAt: entity.earnedAt,
      createdAt: entity.createdAt,
    });
  }

  private badgeToEntity(badge: UserBadge): Partial<UserBadgeEntity> {
    return {
      id: badge.id,
      userId: badge.userId,
      badgeId: badge.badgeId,
      badgeName: badge.badgeName,
      badgeEmoji: badge.badgeEmoji,
      challengeId: badge.challengeId,
      earnedAt: badge.earnedAt,
    };
  }
}
