import { Injectable, Inject } from '@nestjs/common';
import { ChallengeRepository } from '@domain/repositories/challenge.repository';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';
import {
  SessionCompletionData,
  ChallengeUpdate,
} from '@application/dto/challenge.dto';

@Injectable()
export class EvaluateChallengeUseCase {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private readonly challengeRepo: ChallengeRepository,
  ) {}

  async execute(
    userId: string,
    sessionData: SessionCompletionData,
  ): Promise<ChallengeUpdate[]> {
    const activeChallenges =
      await this.challengeRepo.findActiveChallengesByUserId(userId);
    if (activeChallenges.length === 0) return [];

    // Batch fetch all templates (N+1 → 1 query)
    const templateIds = [
      ...new Set(activeChallenges.map((c) => c.challengeTemplateId)),
    ];
    const templates = await this.challengeRepo.findTemplatesByIds(templateIds);
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    // Batch fetch existing badges for this user
    const existingBadges =
      await this.challengeRepo.findBadgesByUserId(userId);
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    const updates: ChallengeUpdate[] = [];

    for (const challenge of activeChallenges) {
      const checkedChallenge = challenge.checkExpiry(new Date());
      if (checkedChallenge.status === 'failed') {
        await this.challengeRepo.saveChallenge(checkedChallenge);
        continue;
      }

      const template = templateMap.get(challenge.challengeTemplateId);
      if (!template) continue;

      const shouldIncrement = this.evaluateCondition(template, sessionData);
      if (!shouldIncrement) continue;

      const updated = checkedChallenge.incrementProgress();
      await this.challengeRepo.saveChallenge(updated);

      let badgeEarned: UserBadge | null = null;
      if (updated.status === 'completed' && !existingBadgeIds.has(template.badgeId)) {
        badgeEarned = UserBadge.create(
          userId,
          template.badgeId,
          template.badgeName,
          template.badgeEmoji,
          updated.id,
        );
        await this.challengeRepo.saveBadge(badgeEarned);
        existingBadgeIds.add(template.badgeId);
      }

      updates.push({
        challengeId: updated.id,
        challengeName: template.name,
        previousProgress: challenge.currentProgress,
        currentProgress: updated.currentProgress,
        targetProgress: updated.targetProgress,
        isCompleted: updated.status === 'completed',
        isCloseToCompletion: updated.isCloseToCompletion,
        badgeEarned: badgeEarned
          ? {
              badgeId: badgeEarned.badgeId,
              badgeName: badgeEarned.badgeName,
              badgeEmoji: badgeEarned.badgeEmoji,
            }
          : null,
      });
    }

    return updates;
  }

  private evaluateCondition(
    template: ChallengeTemplate,
    data: SessionCompletionData,
  ): boolean {
    switch (template.conditionType) {
      case 'duration_under':
        return (
          data.totalDurationMinutes !== undefined &&
          data.totalDurationMinutes < template.conditionValue
        );
      case 'consecutive_days':
        return (
          data.currentStreak !== undefined &&
          data.currentStreak >= template.conditionValue
        );
      case 'weekly_count':
        return (
          data.weeklySessionCount !== undefined &&
          data.weeklySessionCount >= template.conditionValue
        );
      case 'weekday_complete':
        return (
          data.weekdaySessionsThisWeek !== undefined &&
          data.weekdaySessionsThisWeek.length >= template.conditionValue
        );
      default:
        return false;
    }
  }
}
