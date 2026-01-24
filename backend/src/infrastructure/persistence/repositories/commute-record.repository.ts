import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, MoreThanOrEqual } from 'typeorm';
import { CommuteRecordEntity } from '../typeorm/commute-record.entity';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';

@Injectable()
export class CommuteRecordRepositoryImpl implements ICommuteRecordRepository {
  constructor(
    @InjectRepository(CommuteRecordEntity)
    private readonly repository: Repository<CommuteRecordEntity>,
  ) {}

  async save(record: CommuteRecord): Promise<void> {
    const entity = this.toEntity(record);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<CommuteRecord | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string, limit = 100): Promise<CommuteRecord[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { commuteDate: 'DESC' },
      take: limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserIdAndType(
    userId: string,
    commuteType: CommuteType,
    limit = 100
  ): Promise<CommuteRecord[]> {
    const entities = await this.repository.find({
      where: { userId, commuteType },
      order: { commuteDate: 'DESC' },
      take: limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommuteRecord[]> {
    const entities = await this.repository.find({
      where: {
        userId,
        commuteDate: Between(startDate, endDate),
      },
      order: { commuteDate: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findRecentByUserId(userId: string, days: number): Promise<CommuteRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entities = await this.repository.find({
      where: {
        userId,
        commuteDate: MoreThanOrEqual(cutoffDate),
      },
      order: { commuteDate: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    const result = await this.repository.delete({
      commuteDate: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId });
    return result.affected || 0;
  }

  private toEntity(record: CommuteRecord): CommuteRecordEntity {
    const entity = new CommuteRecordEntity();
    if (record.id) entity.id = record.id;
    entity.userId = record.userId;
    entity.alertId = record.alertId;
    entity.commuteDate = record.commuteDate;
    entity.commuteType = record.commuteType;
    entity.scheduledDeparture = record.scheduledDeparture;
    entity.actualDeparture = record.actualDeparture;
    entity.weatherCondition = record.weatherCondition;
    entity.transitDelayMinutes = record.transitDelayMinutes;
    entity.notes = record.notes;
    return entity;
  }

  private toDomain(entity: CommuteRecordEntity): CommuteRecord {
    return new CommuteRecord(
      entity.userId,
      entity.commuteDate,
      entity.commuteType as CommuteType,
      {
        id: entity.id,
        alertId: entity.alertId,
        scheduledDeparture: entity.scheduledDeparture,
        actualDeparture: entity.actualDeparture,
        weatherCondition: entity.weatherCondition,
        transitDelayMinutes: entity.transitDelayMinutes,
        notes: entity.notes,
        createdAt: entity.createdAt,
      }
    );
  }
}
