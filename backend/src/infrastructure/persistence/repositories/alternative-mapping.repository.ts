import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlternativeMappingEntity } from '../typeorm/alternative-mapping.entity';
import { IAlternativeMappingRepository } from '@domain/repositories/alternative-mapping.repository';
import { AlternativeMapping } from '@domain/entities/alternative-mapping.entity';

@Injectable()
export class AlternativeMappingRepositoryImpl implements IAlternativeMappingRepository {
  constructor(
    @InjectRepository(AlternativeMappingEntity)
    private readonly repository: Repository<AlternativeMappingEntity>,
  ) {}

  async findAll(): Promise<AlternativeMapping[]> {
    const entities = await this.repository.find({
      order: { fromStationName: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findActive(): Promise<AlternativeMapping[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { fromStationName: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByStationAndLine(
    stationName: string,
    line: string,
  ): Promise<AlternativeMapping[]> {
    // Find direct matches (from_station matches)
    const directMatches = await this.repository.find({
      where: {
        fromStationName: stationName,
        fromLine: line,
        isActive: true,
      },
    });

    // Find reverse matches (to_station matches, for bidirectional mappings)
    const reverseMatches = await this.repository.find({
      where: {
        toStationName: stationName,
        toLine: line,
        isBidirectional: true,
        isActive: true,
      },
    });

    const allEntities = [...directMatches, ...reverseMatches];
    // Deduplicate by id
    const uniqueMap = new Map(allEntities.map((e) => [e.id, e]));
    return Array.from(uniqueMap.values()).map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<AlternativeMapping | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async save(mapping: AlternativeMapping): Promise<AlternativeMapping> {
    const entity = this.toEntity(mapping);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: AlternativeMappingEntity): AlternativeMapping {
    return new AlternativeMapping(
      entity.fromStationName,
      entity.fromLine,
      entity.toStationName,
      entity.toLine,
      entity.walkingMinutes,
      {
        id: entity.id,
        walkingDistanceMeters: entity.walkingDistanceMeters,
        description: entity.description,
        isBidirectional: entity.isBidirectional,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    );
  }

  private toEntity(mapping: AlternativeMapping): AlternativeMappingEntity {
    const entity = new AlternativeMappingEntity();
    if (mapping.id) entity.id = mapping.id;
    entity.fromStationName = mapping.fromStationName;
    entity.fromLine = mapping.fromLine;
    entity.toStationName = mapping.toStationName;
    entity.toLine = mapping.toLine;
    entity.walkingMinutes = mapping.walkingMinutes;
    entity.walkingDistanceMeters = mapping.walkingDistanceMeters;
    entity.description = mapping.description;
    entity.isBidirectional = mapping.isBidirectional;
    entity.isActive = mapping.isActive;
    return entity;
  }
}
