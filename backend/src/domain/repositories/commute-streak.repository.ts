import { CommuteStreak } from '@domain/entities/commute-streak.entity';
import { StreakDailyLog } from '@domain/entities/streak-daily-log.entity';

export interface ICommuteStreakRepository {
  findByUserId(userId: string): Promise<CommuteStreak | undefined>;
  save(streak: CommuteStreak): Promise<CommuteStreak>;
  update(streak: CommuteStreak): Promise<void>;
  saveDailyLog(log: StreakDailyLog): Promise<StreakDailyLog>;
  findDailyLog(userId: string, recordDate: string): Promise<StreakDailyLog | undefined>;
}

export const COMMUTE_STREAK_REPOSITORY = Symbol('ICommuteStreakRepository');
