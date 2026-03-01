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

    // Batch-load all templates in one query to avoid N+1
    const templateIds = [...new Set(activeChallenges.map((c) => c.challengeTemplateId))];
    const templateMap = await this.challengeRepo.findTemplatesByIds(templateIds);

    const updates: ChallengeUpdate[] = [];

    for (const challenge of activeChallenges) {
      // First check expiry
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

      // If completed, award badge
      let badgeEarned: UserBadge | null = null;
      if (updated.status === 'completed') {
        const existingBadge =
          await this.challengeRepo.findBadgeByUserAndBadgeId(
            userId,
            template.badgeId,
          );
        if (!existingBadge) {
          badgeEarned = UserBadge.create(
            userId,
            template.badgeId,
            template.badgeName,
            template.badgeEmoji,
            updated.id,
          );
          await this.challengeRepo.saveBadge(badgeEarned);
        }
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
