import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckpointRecordEntity } from '../typeorm/checkpoint-record.entity';
import { ICheckpointRecordRepository } from '@domain/repositories/checkpoint-record.repository';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';

@Injectable()
export class CheckpointRecordRepositoryImpl implements ICheckpointRecordRepository {
  constructor(
    @InjectRepository(CheckpointRecordEntity)
    private readonly repository: Repository<CheckpointRecordEntity>,
  ) {}

  async save(record: CheckpointRecord): Promise<CheckpointRecord> {
    const entity = this.toEntity(record);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<CheckpointRecord | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findBySessionId(sessionId: string): Promise<CheckpointRecord[]> {
    const entities = await this.repository.find({
      where: { sessionId },
      order: { arrivedAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByCheckpointId(checkpointId: string, limit = 50): Promise<CheckpointRecord[]> {
    const entities = await this.repository.find({
      where: { checkpointId },
      order: { arrivedAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findLatestBySessionId(sessionId: string): Promise<CheckpointRecord | undefined> {
    const entity = await this.repository.findOne({
      where: { sessionId },
      order: { arrivedAt: 'DESC' },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async countBySessionId(sessionId: string): Promise<number> {
    return this.repository.count({ where: { sessionId } });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await this.repository.delete({ sessionId });
    return result.affected || 0;
  }

  private toEntity(record: CheckpointRecord): CheckpointRecordEntity {
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

  private toDomain(entity: CheckpointRecordEntity): CheckpointRecord {
    return new CheckpointRecord(entity.sessionId, entity.checkpointId, entity.arrivedAt, {
      id: entity.id,
      durationFromPrevious: entity.durationFromPrevious,
      actualWaitTime: entity.actualWaitTime,
      isDelayed: entity.isDelayed,
      delayMinutes: entity.delayMinutes,
      waitDelayMinutes: entity.waitDelayMinutes,
      notes: entity.notes,
      createdAt: entity.createdAt,
    });
  }
}
