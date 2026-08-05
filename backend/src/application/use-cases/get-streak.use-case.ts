import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  ICommuteStreakRepository,
  COMMUTE_STREAK_REPOSITORY,
} from '@domain/repositories/commute-streak.repository';
import { CommuteStreak, MILESTONES } from '@domain/entities/commute-streak.entity';
import { getTodayKST, getWeekStartKST } from '@domain/utils/kst-date';
import type {
  StreakResponseDto,
  MilestonesResponseDto,
  MilestoneInfoDto,
  StreakBadgeDto,
} from '@application/dto/streak.dto';

@Injectable()
export class GetStreakUseCase {
  constructor(
    @Optional()
    @Inject(COMMUTE_STREAK_REPOSITORY)
    private readonly streakRepository?: ICommuteStreakRepository,
  ) {}

  async execute(userId: string): Promise<StreakResponseDto> {
    if (!this.streakRepository) {
      throw new Error('Streak repository not available');
    }

    const todayKST = getTodayKST();
    const weekStart = getWeekStartKST(todayKST);

    let streak = await this.streakRepository.findByUserId(userId);

    if (!streak) {
      streak = CommuteStreak.createNew(userId);
    }

    // 저장된 값은 마지막 기록 시점의 것이라 조회 시점 기준으로 바로잡는다
    streak.ensureStreakCurrent(todayKST);
    streak.ensureWeeklyCountCurrent(todayKST);

    const status = streak.getStatus(todayKST);
    const nextMilestone = streak.getNextMilestone();
    const todayRecorded = streak.lastRecordDate === todayKST;

    return {
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      lastRecordDate: streak.lastRecordDate,
      streakStartDate: streak.streakStartDate,
      weeklyGoal: streak.weeklyGoal,
      weeklyCount: streak.weeklyCount,
      weekStartDate: streak.weekStartDate || weekStart,
      milestonesAchieved: streak.milestonesAchieved,
      latestMilestone: streak.latestMilestone,
      nextMilestone,
      streakStatus: status,
      excludeWeekends: streak.excludeWeekends,
      reminderEnabled: streak.reminderEnabled,
      todayRecorded,
    };
  }

  async getMilestones(userId: string): Promise<MilestonesResponseDto> {
    if (!this.streakRepository) {
      throw new Error('Streak repository not available');
    }

    let streak = await this.streakRepository.findByUserId(userId);

    if (!streak) {
      streak = CommuteStreak.createNew(userId);
    }

    // 홈 배지와 같은 기준으로 세야 두 화면의 숫자가 어긋나지 않는다
    streak.ensureStreakCurrent(getTodayKST());

    const milestones: MilestoneInfoDto[] = MILESTONES.map((m) => {
      const achieved = streak!.milestonesAchieved.includes(m.type);
      if (achieved) {
        return { type: m.type, label: m.label, achieved: true, badge: m.badge, badgeName: m.badgeName };
      }
      const daysRemaining = Math.max(0, m.days - streak!.currentStreak);
      const progress = Math.min(1, streak!.currentStreak / m.days);
      return { type: m.type, label: m.label, achieved: false, daysRemaining, progress, badge: m.badge, badgeName: m.badgeName };
    });

    const earnedBadges: StreakBadgeDto[] = MILESTONES
      .filter((m) => streak!.milestonesAchieved.includes(m.type))
      .map((m) => ({
        type: m.type,
        badge: m.badge,
        badgeName: m.badgeName,
        label: m.label,
      }));

    return {
      milestones,
      currentStreak: streak.currentStreak,
      earnedBadges,
    };
  }
}
