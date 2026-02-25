import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission, MissionType } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MissionEntity } from './typeorm/mission.entity';
import { DailyMissionRecordEntity } from './typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from './typeorm/mission-score.entity';

@Injectable()
export class MissionRepositoryImpl implements IMissionRepository {
  constructor(
    @InjectRepository(MissionEntity)
    private readonly missionRepo: Repository<MissionEntity>,
    @InjectRepository(DailyMissionRecordEntity)
    private readonly recordRepo: Repository<DailyMissionRecordEntity>,
    @InjectRepository(MissionScoreEntity)
    private readonly scoreRepo: Repository<MissionScoreEntity>,
  ) {}

  // --- Mission CRUD ---

  async findByUserId(userId: string): Promise<Mission[]> {
    const entities = await this.missionRepo.find({
      where: { userId },
      order: { missionType: 'ASC', sortOrder: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Mission | null> {
    const entity = await this.missionRepo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async countByUserAndType(userId: string, missionType: MissionType): Promise<number> {
    return this.missionRepo.count({ where: { userId, missionType, isActive: true } });
  }

  async saveMission(mission: Mission): Promise<Mission> {
    const entity = this.missionRepo.create({
      id: mission.id,
      userId: mission.userId,
      title: mission.title,
      emoji: mission.emoji,
      missionType: mission.missionType,
      isActive: mission.isActive,
      sortOrder: mission.sortOrder,
    });
    const saved = await this.missionRepo.save(entity);
    return this.toDomain(saved);
  }

  async deleteMission(id: string): Promise<void> {
    await this.missionRepo.delete(id);
  }

  // --- Daily Records ---

  async findDailyRecords(userId: string, date: string): Promise<DailyMissionRecord[]> {
    const entities = await this.recordRepo.find({ where: { userId, date } });
    return entities.map((e) => this.toRecordDomain(e));
  }

  async findDailyRecord(
    userId: string,
    missionId: string,
    date: string,
  ): Promise<DailyMissionRecord | null> {
    const entity = await this.recordRepo.findOne({
      where: { userId, missionId, date },
    });
    return entity ? this.toRecordDomain(entity) : null;
  }

  async saveDailyRecord(record: DailyMissionRecord): Promise<DailyMissionRecord> {
    const entity = this.recordRepo.create({
      id: record.id,
      userId: record.userId,
      missionId: record.missionId,
      date: record.date,
      isCompleted: record.isCompleted,
      completedAt: record.completedAt,
    });
    const saved = await this.recordRepo.save(entity);
    return this.toRecordDomain(saved);
  }

  // --- Scores ---

  async findScore(userId: string, date: string): Promise<MissionScore | null> {
    const entity = await this.scoreRepo.findOne({ where: { userId, date } });
    return entity ? this.toScoreDomain(entity) : null;
  }

  async findScoreRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<MissionScore[]> {
    const entities = await this.scoreRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });
    return entities.map((e) => this.toScoreDomain(e));
  }

  async saveScore(score: MissionScore): Promise<MissionScore> {
    const entity = this.scoreRepo.create({
      id: score.id,
      userId: score.userId,
      date: score.date,
      totalMissions: score.totalMissions,
      completedMissions: score.completedMissions,
      completionRate: score.completionRate,
      streakDay: score.streakDay,
    });
    const saved = await this.scoreRepo.save(entity);
    return this.toScoreDomain(saved);
  }

  // --- Stats ---

  async findLatestStreak(userId: string): Promise<number> {
    const latest = await this.scoreRepo.findOne({
      where: { userId },
      order: { date: 'DESC' },
    });
    return latest?.streakDay ?? 0;
  }

  // --- Private Mappers ---

  private toDomain(entity: MissionEntity): Mission {
    return new Mission({
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      emoji: entity.emoji,
      missionType: entity.missionType as MissionType,
      isActive: entity.isActive,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toRecordDomain(entity: DailyMissionRecordEntity): DailyMissionRecord {
    return new DailyMissionRecord({
      id: entity.id,
      userId: entity.userId,
      missionId: entity.missionId,
      date: entity.date,
      isCompleted: entity.isCompleted,
      completedAt: entity.completedAt,
      createdAt: entity.createdAt,
    });
  }

  private toScoreDomain(entity: MissionScoreEntity): MissionScore {
    return new MissionScore({
      id: entity.id,
      userId: entity.userId,
      date: entity.date,
      totalMissions: entity.totalMissions,
      completedMissions: entity.completedMissions,
      completionRate: Number(entity.completionRate),
      streakDay: entity.streakDay,
      createdAt: entity.createdAt,
    });
  }
}
