import { Injectable, Inject } from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MISSION_REPOSITORY } from './manage-mission.use-case';

export type WeeklyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

export type MonthlyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

@Injectable()
export class MissionStatsUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async getWeeklyStats(
    userId: string,
    todayKST: string,
  ): Promise<WeeklyStats> {
    const startDate = this.daysAgo(todayKST, 6);
    const scores = await this.repo.findScoreRange(userId, startDate, todayKST);
    return this.buildStats(scores);
  }

  async getMonthlyStats(
    userId: string,
    todayKST: string,
  ): Promise<MonthlyStats> {
    const startDate = this.daysAgo(todayKST, 29);
    const scores = await this.repo.findScoreRange(userId, startDate, todayKST);
    return this.buildStats(scores);
  }

  async getStreak(userId: string): Promise<number> {
    return this.repo.findLatestStreak(userId);
  }

  private buildStats(scores: MissionScore[]): WeeklyStats {
    if (scores.length === 0) {
      return {
        totalCompleted: 0,
        totalMissions: 0,
        completionRate: 0,
        dailyScores: [],
      };
    }

    const totalMissions = scores.reduce((sum, s) => sum + s.totalMissions, 0);
    const totalCompleted = scores.reduce(
      (sum, s) => sum + s.completedMissions,
      0,
    );
    const completionRate =
      totalMissions === 0
        ? 0
        : Math.round((totalCompleted / totalMissions) * 100);

    return {
      totalCompleted,
      totalMissions,
      completionRate,
      dailyScores: scores,
    };
  }

  private daysAgo(dateStr: string, days: number): string {
    const date = new Date(dateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - days);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
