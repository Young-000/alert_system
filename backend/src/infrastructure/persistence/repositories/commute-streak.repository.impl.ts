import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICommuteStreakRepository } from '@domain/repositories/commute-streak.repository';
import { CommuteStreak, MilestoneType } from '@domain/entities/commute-streak.entity';
import { StreakDailyLog } from '@domain/entities/streak-daily-log.entity';
import { CommuteStreakOrmEntity } from '@infrastructure/persistence/typeorm/commute-streak.orm-entity';
import { StreakDailyLogOrmEntity } from '@infrastructure/persistence/typeorm/streak-daily-log.orm-entity';

@Injectable()
export class CommuteStreakRepositoryImpl implements ICommuteStreakRepository {
  constructor(
    @InjectRepository(CommuteStreakOrmEntity)
    private readonly streakRepo: Repository<CommuteStreakOrmEntity>,
    @InjectRepository(StreakDailyLogOrmEntity)
    private readonly dailyLogRepo: Repository<StreakDailyLogOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CommuteStreak | undefined> {
    const entity = await this.streakRepo.findOne({ where: { userId } });
    if (!entity) return undefined;
    return this.toDomain(entity);
  }

  async save(streak: CommuteStreak): Promise<CommuteStreak> {
    const entity = this.toEntity(streak);
    const saved = await this.streakRepo.save(entity);
    return this.toDomain(saved);
  }

  async update(streak: CommuteStreak): Promise<void> {
    const entity = this.toEntity(streak);
    await this.streakRepo.save(entity);
  }

  async saveDailyLog(log: StreakDailyLog): Promise<StreakDailyLog> {
    const entity = new StreakDailyLogOrmEntity();
    if (log.id) entity.id = log.id;
    entity.userId = log.userId;
    entity.recordDate = log.recordDate;
    entity.sessionId = log.sessionId;
    const saved = await this.dailyLogRepo.save(entity);
    return new StreakDailyLog(saved.userId, saved.recordDate, saved.sessionId, {
      id: saved.id,
      createdAt: saved.createdAt,
    });
  }

  async findDailyLog(userId: string, recordDate: string): Promise<StreakDailyLog | undefined> {
    const entity = await this.dailyLogRepo.findOne({
      where: { userId, recordDate },
    });
    if (!entity) return undefined;
    return new StreakDailyLog(entity.userId, entity.recordDate, entity.sessionId, {
      id: entity.id,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(domain: CommuteStreak): CommuteStreakOrmEntity {
    const entity = new CommuteStreakOrmEntity();
    if (domain.id) entity.id = domain.id;
    entity.userId = domain.userId;
    entity.currentStreak = domain.currentStreak;
    entity.streakStartDate = domain.streakStartDate;
    entity.lastRecordDate = domain.lastRecordDate;
    entity.bestStreak = domain.bestStreak;
    entity.bestStreakStart = domain.bestStreakStart;
    entity.bestStreakEnd = domain.bestStreakEnd;
    entity.weeklyGoal = domain.weeklyGoal;
    entity.weeklyCount = domain.weeklyCount;
    entity.weekStartDate = domain.weekStartDate;
    entity.milestonesAchieved = domain.milestonesAchieved;
    entity.latestMilestone = domain.latestMilestone;
    entity.excludeWeekends = domain.excludeWeekends;
    entity.reminderEnabled = domain.reminderEnabled;
    return entity;
  }

  private toDomain(entity: CommuteStreakOrmEntity): CommuteStreak {
    return new CommuteStreak(entity.userId, {
      id: entity.id,
      currentStreak: entity.currentStreak,
      streakStartDate: entity.streakStartDate,
      lastRecordDate: entity.lastRecordDate,
      bestStreak: entity.bestStreak,
      bestStreakStart: entity.bestStreakStart,
      bestStreakEnd: entity.bestStreakEnd,
      weeklyGoal: entity.weeklyGoal,
      weeklyCount: entity.weeklyCount,
      weekStartDate: entity.weekStartDate,
      milestonesAchieved: (entity.milestonesAchieved || []).filter(Boolean) as MilestoneType[],
      latestMilestone: (entity.latestMilestone as MilestoneType) || null,
      excludeWeekends: entity.excludeWeekends,
      reminderEnabled: entity.reminderEnabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
