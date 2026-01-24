import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { BehaviorEventEntity } from '../typeorm/behavior-event.entity';
import { IBehaviorEventRepository } from '@domain/repositories/behavior-event.repository';
import {
  BehaviorEvent,
  BehaviorEventType,
  BehaviorEventMetadata,
} from '@domain/entities/behavior-event.entity';

@Injectable()
export class BehaviorEventRepositoryImpl implements IBehaviorEventRepository {
  constructor(
    @InjectRepository(BehaviorEventEntity)
    private readonly repository: Repository<BehaviorEventEntity>,
  ) {}

  async save(event: BehaviorEvent): Promise<void> {
    const entity = this.toEntity(event);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<BehaviorEvent | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string, limit = 100): Promise<BehaviorEvent[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserIdAndType(
    userId: string,
    eventType: BehaviorEventType,
    limit = 100
  ): Promise<BehaviorEvent[]> {
    const entities = await this.repository.find({
      where: { userId, eventType },
      order: { timestamp: 'DESC' },
      take: limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BehaviorEvent[]> {
    const entities = await this.repository.find({
      where: {
        userId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async countByUserIdAndType(
    userId: string,
    eventType: BehaviorEventType
  ): Promise<number> {
    return this.repository.count({
      where: { userId, eventType },
    });
  }

  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    const result = await this.repository.delete({
      timestamp: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId });
    return result.affected || 0;
  }

  private toEntity(event: BehaviorEvent): BehaviorEventEntity {
    const entity = new BehaviorEventEntity();
    if (event.id) entity.id = event.id;
    entity.userId = event.userId;
    entity.alertId = event.alertId;
    entity.eventType = event.eventType;
    entity.timestamp = event.timestamp;
    entity.dayOfWeek = event.dayOfWeek;
    entity.isWeekday = event.isWeekday;
    entity.metadata = event.metadata as object;
    return entity;
  }

  private toDomain(entity: BehaviorEventEntity): BehaviorEvent {
    return new BehaviorEvent(
      entity.userId,
      entity.eventType as BehaviorEventType,
      {
        id: entity.id,
        alertId: entity.alertId,
        timestamp: entity.timestamp,
        metadata: entity.metadata as BehaviorEventMetadata,
      }
    );
  }
}
