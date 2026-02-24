import { Injectable, Inject } from '@nestjs/common';
import { ChallengeRepository } from '@domain/repositories/challenge.repository';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import {
  MAX_ACTIVE_CHALLENGES,
  TemplateWithStatus,
  ActiveChallengeDetail,
  ChallengeHistoryResult,
  BadgeCollectionResult,
} from '@application/dto/challenge.dto';

@Injectable()
export class ManageChallengeUseCase {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private readonly challengeRepo: ChallengeRepository,
  ) {}

  async getTemplates(userId: string): Promise<TemplateWithStatus[]> {
    const templates = await this.challengeRepo.findAllTemplates();
    const activeChallenges =
      await this.challengeRepo.findActiveChallengesByUserId(userId);
    const badges = await this.challengeRepo.findBadgesByUserId(userId);

    const activeTemplateIds = new Set(
      activeChallenges.map((c) => c.challengeTemplateId),
    );
    const completedBadgeIds = new Set(badges.map((b) => b.badgeId));

    return templates.map((template) => ({
      template,
      isJoined: activeTemplateIds.has(template.id),
      isCompleted: completedBadgeIds.has(template.badgeId),
    }));
  }

  async joinChallenge(
    userId: string,
    templateId: string,
  ): Promise<UserChallenge> {
    const template = await this.challengeRepo.findTemplateById(templateId);
    if (!template) {
      throw new Error('챌린지 템플릿을 찾을 수 없습니다.');
    }

    const activeCount = await this.challengeRepo.countActiveChallenges(userId);
    if (activeCount >= MAX_ACTIVE_CHALLENGES) {
      throw new ChallengeConflictError(
        `동시에 최대 ${MAX_ACTIVE_CHALLENGES}개의 챌린지만 참여할 수 있습니다.`,
      );
    }

    const existing = await this.challengeRepo.findActiveByUserAndTemplate(
      userId,
      templateId,
    );
    if (existing) {
      throw new ChallengeConflictError(
        '이미 참여 중인 챌린지입니다.',
      );
    }

    const challenge = UserChallenge.create(
      userId,
      templateId,
      template.targetValue,
      template.durationDays,
    );

    return this.challengeRepo.saveChallenge(challenge);
  }

  async abandonChallenge(
    userId: string,
    challengeId: string,
  ): Promise<void> {
    const challenge = await this.challengeRepo.findChallengeById(challengeId);
    if (!challenge) {
      throw new Error('챌린지를 찾을 수 없습니다.');
    }

    if (challenge.userId !== userId) {
      throw new Error('본인의 챌린지만 포기할 수 있습니다.');
    }

    const abandoned = challenge.abandon();
    await this.challengeRepo.saveChallenge(abandoned);
  }

  async getActiveChallenges(userId: string): Promise<ActiveChallengeDetail[]> {
    const activeChallenges =
      await this.challengeRepo.findActiveChallengesByUserId(userId);
    const now = new Date();

    // Lazy expiry check first
    const validChallenges: UserChallenge[] = [];
    for (const challenge of activeChallenges) {
      const checked = challenge.checkExpiry(now);
      if (checked.status === 'failed') {
        await this.challengeRepo.saveChallenge(checked);
        continue;
      }
      validChallenges.push(checked);
    }

    // Batch fetch all templates at once (N+1 방지)
    const templateIds = [...new Set(validChallenges.map((c) => c.challengeTemplateId))];
    const templates = await this.challengeRepo.findTemplatesByIds(templateIds);
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const details: ActiveChallengeDetail[] = [];
    for (const checked of validChallenges) {
      const template = templateMap.get(checked.challengeTemplateId);
      if (!template) continue;

      details.push({
        id: checked.id,
        template,
        status: checked.status,
        startedAt: checked.startedAt,
        deadlineAt: checked.deadlineAt,
        currentProgress: checked.currentProgress,
        targetProgress: checked.targetProgress,
        progressPercent: checked.progressPercent,
        daysRemaining: checked.daysRemaining,
        isCloseToCompletion: checked.isCloseToCompletion,
      });
    }

    return details;
  }

  async getChallengeHistory(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ChallengeHistoryResult> {
    const { challenges, totalCount } =
      await this.challengeRepo.findChallengeHistory(userId, limit, offset);

    // Batch fetch all templates at once (N+1 방지)
    const templateIds = [...new Set(challenges.map((c) => c.challengeTemplateId))];
    const templates = await this.challengeRepo.findTemplatesByIds(templateIds);
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const details: ActiveChallengeDetail[] = [];
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalAbandoned = 0;

    for (const challenge of challenges) {
      const template = templateMap.get(challenge.challengeTemplateId);
      if (!template) continue;

      details.push({
        id: challenge.id,
        template,
        status: challenge.status,
        startedAt: challenge.startedAt,
        deadlineAt: challenge.deadlineAt,
        currentProgress: challenge.currentProgress,
        targetProgress: challenge.targetProgress,
        progressPercent: challenge.progressPercent,
        daysRemaining: challenge.daysRemaining,
        isCloseToCompletion: challenge.isCloseToCompletion,
      });

      if (challenge.status === 'completed') totalCompleted++;
      if (challenge.status === 'failed') totalFailed++;
      if (challenge.status === 'abandoned') totalAbandoned++;
    }

    const totalFinished = totalCompleted + totalFailed + totalAbandoned;
    const completionRate =
      totalFinished > 0
        ? Math.round((totalCompleted / totalFinished) * 100)
        : 0;

    return {
      challenges: details,
      totalCount,
      stats: {
        totalCompleted,
        totalFailed,
        totalAbandoned,
        completionRate,
      },
    };
  }

  async getBadges(userId: string): Promise<BadgeCollectionResult> {
    const badges = await this.challengeRepo.findBadgesByUserId(userId);
    const totalBadges = await this.challengeRepo.countTotalBadges();

    return {
      badges,
      totalBadges,
      earnedCount: badges.length,
    };
  }
}

export class ChallengeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeConflictError';
  }
}
