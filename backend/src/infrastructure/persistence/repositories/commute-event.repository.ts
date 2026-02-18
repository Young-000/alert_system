import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CommuteEventEntity } from '../typeorm/commute-event.entity';
import { ICommuteEventRepository } from '@domain/repositories/commute-event.repository';
import { CommuteEvent } from '@domain/entities/commute-event.entity';
import type { CommuteEventType, CommuteEventSource } from '@domain/entities/commute-event.entity';

@Injectable()
export class CommuteEventRepositoryImpl implements ICommuteEventRepository {
  constructor(
    @InjectRepository(CommuteEventEntity)
    private readonly eventRepository: Repository<CommuteEventEntity>,
  ) {}

  async save(event: CommuteEvent): Promise<CommuteEvent> {
    const entity = this.toEntity(event);
    const saved = await this.eventRepository.save(entity);
    return this.toDomain(saved);
  }

  async saveBatch(events: CommuteEvent[]): Promise<CommuteEvent[]> {
    const entities = events.map((e) => this.toEntity(e));
    const saved = await this.eventRepository.save(entities);
    return saved.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<CommuteEvent | undefined> {
    const entity = await this.eventRepository.findOne({
      where: { id },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string, limit = 50): Promise<CommuteEvent[]> {
    const entities = await this.eventRepository.find({
      where: { userId },
      order: { triggeredAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findRecent(
    userId: string,
    placeId: string,
    eventType: CommuteEventType,
    withinMs: number
  ): Promise<CommuteEvent | undefined> {
    const cutoff = new Date(Date.now() - withinMs);
    const entity = await this.eventRepository.findOne({
      where: {
        userId,
        placeId,
        eventType,
        triggeredAt: MoreThanOrEqual(cutoff),
      },
      order: { triggeredAt: 'DESC' },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async markProcessed(id: string): Promise<void> {
    await this.eventRepository.update(id, { isProcessed: true });
  }

  async update(event: CommuteEvent): Promise<void> {
    const entity = this.toEntity(event);
    await this.eventRepository.save(entity);
  }

  private toEntity(event: CommuteEvent): CommuteEventEntity {
    const entity = new CommuteEventEntity();
    if (event.id) entity.id = event.id;
    entity.userId = event.userId;
    entity.placeId = event.placeId;
    entity.eventType = event.eventType;
    entity.triggeredAt = event.triggeredAt;
    entity.recordedAt = event.recordedAt;
    entity.latitude = event.latitude;
    entity.longitude = event.longitude;
    entity.accuracyM = event.accuracyM;
    entity.sessionId = event.sessionId;
    entity.source = event.source;
    entity.isProcessed = event.isProcessed;
    return entity;
  }

  private toDomain(entity: CommuteEventEntity): CommuteEvent {
    return new CommuteEvent(
      entity.userId,
      entity.placeId,
      entity.eventType as CommuteEventType,
      entity.triggeredAt,
      {
        id: entity.id,
        recordedAt: entity.recordedAt,
        latitude: entity.latitude,
        longitude: entity.longitude,
        accuracyM: entity.accuracyM,
        sessionId: entity.sessionId,
        source: entity.source as CommuteEventSource,
        isProcessed: entity.isProcessed,
        createdAt: entity.createdAt,
      }
    );
  }
}
