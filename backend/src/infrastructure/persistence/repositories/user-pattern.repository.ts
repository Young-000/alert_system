import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPatternEntity } from '../typeorm/user-pattern.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import {
  UserPattern,
  PatternType,
  PatternValue,
} from '@domain/entities/user-pattern.entity';

@Injectable()
export class UserPatternRepositoryImpl implements IUserPatternRepository {
  constructor(
    @InjectRepository(UserPatternEntity)
    private readonly repository: Repository<UserPatternEntity>,
  ) {}

  async save(pattern: UserPattern): Promise<void> {
    const entity = this.toEntity(pattern);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<UserPattern | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string): Promise<UserPattern[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { patternType: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserIdAndType(
    userId: string,
    patternType: PatternType
  ): Promise<UserPattern | undefined> {
    const entity = await this.repository.findOne({
      where: { userId, patternType },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserIdTypeAndDay(
    userId: string,
    patternType: PatternType,
    dayOfWeek?: number,
    isWeekday?: boolean
  ): Promise<UserPattern | undefined> {
    const whereConditions: Record<string, unknown> = {
      userId,
      patternType,
    };

    if (dayOfWeek !== undefined) {
      whereConditions.dayOfWeek = dayOfWeek;
    }
    if (isWeekday !== undefined) {
      whereConditions.isWeekday = isWeekday;
    }

    const entity = await this.repository.findOne({
      where: whereConditions,
    });

    return entity ? this.toDomain(entity) : undefined;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  private toEntity(pattern: UserPattern): UserPatternEntity {
    const entity = new UserPatternEntity();
    if (pattern.id) entity.id = pattern.id;
    entity.userId = pattern.userId;
    entity.patternType = pattern.patternType;
    entity.dayOfWeek = pattern.dayOfWeek;
    entity.isWeekday = pattern.isWeekday;
    entity.value = pattern.value as object;
    entity.confidence = pattern.confidence;
    entity.sampleCount = pattern.sampleCount;
    entity.lastUpdated = pattern.lastUpdated;
    return entity;
  }

  private toDomain(entity: UserPatternEntity): UserPattern {
    return new UserPattern(
      entity.userId,
      entity.patternType as PatternType,
      entity.value as PatternValue,
      {
        id: entity.id,
        dayOfWeek: entity.dayOfWeek,
        isWeekday: entity.isWeekday,
        confidence: Number(entity.confidence),
        sampleCount: entity.sampleCount,
        lastUpdated: entity.lastUpdated,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      }
    );
  }
}
