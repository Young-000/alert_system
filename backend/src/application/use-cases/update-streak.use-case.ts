import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  ICommuteStreakRepository,
  COMMUTE_STREAK_REPOSITORY,
} from '@domain/repositories/commute-streak.repository';
import { CommuteStreak } from '@domain/entities/commute-streak.entity';
import { StreakDailyLog } from '@domain/entities/streak-daily-log.entity';
import { getTodayKST } from '@domain/utils/kst-date';
import type { StreakUpdateResultDto, UpdateStreakSettingsDto } from '@application/dto/streak.dto';

@Injectable()
export class UpdateStreakUseCase {
  private readonly logger = new Logger(UpdateStreakUseCase.name);

  constructor(
    @Optional()
    @Inject(COMMUTE_STREAK_REPOSITORY)
    private readonly streakRepository?: ICommuteStreakRepository,
  ) {}

  /**
   * 세션 완료 시 스트릭 갱신
   * - 오늘 첫 완료인 경우만 스트릭 증가
   * - 마일스톤 달성 여부 반환
   */
  async recordCompletion(userId: string, sessionId: string): Promise<StreakUpdateResultDto | null> {
    if (!this.streakRepository) {
      throw new Error('Streak repository not available');
    }

    const todayKST = getTodayKST();

    let streak = await this.streakRepository.findByUserId(userId);
    const isNew = !streak;

    if (!streak) {
      streak = CommuteStreak.createNew(userId);
    }

    const previousBest = streak.bestStreak;
    const result = streak.recordCompletion(todayKST);

    if (!result.updated) {
      // 이미 오늘 기록됨
      return {
        currentStreak: streak.currentStreak,
        isNewRecord: false,
        milestoneAchieved: null,
        todayFirstCompletion: false,
        weeklyCount: streak.weeklyCount,
        weeklyGoal: streak.weeklyGoal,
      };
    }

    // 스트릭 저장
    if (isNew) {
      streak = await this.streakRepository.save(streak);
    } else {
      await this.streakRepository.update(streak);
    }

    // 일별 기록 저장
    const dailyLog = StreakDailyLog.create(userId, todayKST, sessionId);
    await this.streakRepository.saveDailyLog(dailyLog);

    this.logger.log(
      `Streak updated for user ${userId}: day ${streak.currentStreak}, milestone: ${result.milestoneAchieved || 'none'}`,
    );

    return {
      currentStreak: streak.currentStreak,
      isNewRecord: streak.bestStreak > previousBest,
      milestoneAchieved: result.milestoneAchieved,
      todayFirstCompletion: true,
      weeklyCount: streak.weeklyCount,
      weeklyGoal: streak.weeklyGoal,
    };
  }

  /**
   * 스트릭 설정 변경
   */
  async updateSettings(
    userId: string,
    dto: UpdateStreakSettingsDto,
  ): Promise<{ success: boolean; weeklyGoal: number; excludeWeekends: boolean; reminderEnabled: boolean }> {
    if (!this.streakRepository) {
      throw new Error('Streak repository not available');
    }

    let streak = await this.streakRepository.findByUserId(userId);

    if (!streak) {
      streak = CommuteStreak.createNew(userId);
    }

    const isNew = !streak.id;

    if (dto.weeklyGoal !== undefined) streak.weeklyGoal = dto.weeklyGoal;
    if (dto.excludeWeekends !== undefined) streak.excludeWeekends = dto.excludeWeekends;
    if (dto.reminderEnabled !== undefined) streak.reminderEnabled = dto.reminderEnabled;
    streak.updatedAt = new Date();

    if (isNew) {
      await this.streakRepository.save(streak);
    } else {
      await this.streakRepository.update(streak);
    }

    return {
      success: true,
      weeklyGoal: streak.weeklyGoal,
      excludeWeekends: streak.excludeWeekends,
      reminderEnabled: streak.reminderEnabled,
    };
  }
}
