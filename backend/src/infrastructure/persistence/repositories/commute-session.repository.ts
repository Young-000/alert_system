import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CommuteSessionEntity } from '../typeorm/commute-session.entity';
import { CheckpointRecordEntity } from '../typeorm/checkpoint-record.entity';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';

@Injectable()
export class CommuteSessionRepositoryImpl implements ICommuteSessionRepository {
  constructor(
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepository: Repository<CommuteSessionEntity>,
    @InjectRepository(CheckpointRecordEntity)
    private readonly recordRepository: Repository<CheckpointRecordEntity>,
  ) {}

  async save(session: CommuteSession): Promise<CommuteSession> {
    const entity = this.toEntity(session);
    const saved = await this.sessionRepository.save(entity);
    return this.findById(saved.id) as Promise<CommuteSession>;
  }

  async findById(id: string): Promise<CommuteSession | undefined> {
    const entity = await this.sessionRepository.findOne({
      where: { id },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByIdWithRecords(id: string): Promise<CommuteSession | undefined> {
    const entity = await this.sessionRepository.findOne({
      where: { id },
      relations: ['checkpointRecords'],
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string, limit = 50): Promise<CommuteSession[]> {
    const entities = await this.sessionRepository.find({
      where: { userId },
      relations: ['checkpointRecords'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserIdAndStatus(
    userId: string,
    status: SessionStatus,
    limit = 50
  ): Promise<CommuteSession[]> {
    const entities = await this.sessionRepository.find({
      where: { userId, status },
      relations: ['checkpointRecords'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findInProgressByUserId(userId: string): Promise<CommuteSession | undefined> {
    const entity = await this.sessionRepository.findOne({
      where: { userId, status: SessionStatus.IN_PROGRESS },
      relations: ['checkpointRecords'],
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommuteSession[]> {
    const entities = await this.sessionRepository.find({
      where: {
        userId,
        startedAt: Between(startDate, endDate),
      },
      relations: ['checkpointRecords'],
      order: { startedAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByRouteId(routeId: string, limit = 50): Promise<CommuteSession[]> {
    const entities = await this.sessionRepository.find({
      where: { routeId },
      relations: ['checkpointRecords'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async update(session: CommuteSession): Promise<void> {
    const entity = this.toEntity(session);
    await this.sessionRepository.save(entity);

    // Update checkpoint records
    if (session.checkpointRecords.length > 0) {
      const recordEntities = session.checkpointRecords.map((r) => this.recordToEntity(r));
      await this.recordRepository.save(recordEntities);
    }
  }

  async delete(id: string): Promise<void> {
    await this.sessionRepository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.sessionRepository.delete({ userId });
    return result.affected || 0;
  }

  private toEntity(session: CommuteSession): CommuteSessionEntity {
    const entity = new CommuteSessionEntity();
    if (session.id) entity.id = session.id;
    entity.userId = session.userId;
    entity.routeId = session.routeId;
    entity.startedAt = session.startedAt;
    entity.completedAt = session.completedAt;
    entity.totalDurationMinutes = session.totalDurationMinutes;
    entity.totalWaitMinutes = session.totalWaitMinutes;
    entity.totalDelayMinutes = session.totalDelayMinutes;
    entity.status = session.status;
    entity.weatherCondition = session.weatherCondition;
    entity.notes = session.notes;
    return entity;
  }

  private recordToEntity(record: CheckpointRecord): CheckpointRecordEntity {
    const entity = new CheckpointRecordEntity();
    if (record.id) entity.id = record.id;
    entity.sessionId = record.sessionId;
    entity.checkpointId = record.checkpointId;
    entity.arrivedAt = record.arrivedAt;
    entity.durationFromPrevious = record.durationFromPrevious;
    entity.actualWaitTime = record.actualWaitTime;
    // isDelayed is computed from delayMinutes
    entity.delayMinutes = record.delayMinutes;
    entity.waitDelayMinutes = record.waitDelayMinutes;
    entity.notes = record.notes;
    return entity;
  }

  private toDomain(entity: CommuteSessionEntity): CommuteSession {
    const checkpointRecords = (entity.checkpointRecords || []).map(
      (r) =>
        new CheckpointRecord(r.sessionId, r.checkpointId, r.arrivedAt, {
          id: r.id,
          durationFromPrevious: r.durationFromPrevious,
          actualWaitTime: r.actualWaitTime,
          isDelayed: r.isDelayed,
          delayMinutes: r.delayMinutes,
          waitDelayMinutes: r.waitDelayMinutes,
          notes: r.notes,
          createdAt: r.createdAt,
        })
    );

    return new CommuteSession(entity.userId, entity.routeId, {
      id: entity.id,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      totalDurationMinutes: entity.totalDurationMinutes,
      totalWaitMinutes: entity.totalWaitMinutes,
      totalDelayMinutes: entity.totalDelayMinutes,
      status: entity.status as SessionStatus,
      weatherCondition: entity.weatherCondition,
      notes: entity.notes,
      checkpointRecords,
      createdAt: entity.createdAt,
    });
  }
}
