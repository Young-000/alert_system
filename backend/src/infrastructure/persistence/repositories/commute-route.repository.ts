import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CommuteRouteEntity } from '../typeorm/commute-route.entity';
import { RouteCheckpointEntity } from '../typeorm/route-checkpoint.entity';
import { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';
import {
  CommuteRoute,
  RouteCheckpoint,
  RouteType,
  CheckpointType,
  TransportMode,
} from '@domain/entities/commute-route.entity';

@Injectable()
export class CommuteRouteRepositoryImpl implements ICommuteRouteRepository {
  constructor(
    @InjectRepository(CommuteRouteEntity)
    private readonly routeRepository: Repository<CommuteRouteEntity>,
    @InjectRepository(RouteCheckpointEntity)
    private readonly checkpointRepository: Repository<RouteCheckpointEntity>,
  ) {}

  async save(route: CommuteRoute): Promise<CommuteRoute> {
    const entity = this.toEntity(route);
    const saved = await this.routeRepository.save(entity);

    // Save checkpoints with route ID
    if (route.checkpoints.length > 0) {
      const checkpointEntities = route.checkpoints.map((cp) => {
        const cpEntity = this.checkpointToEntity(cp);
        cpEntity.routeId = saved.id;
        return cpEntity;
      });
      await this.checkpointRepository.save(checkpointEntities);
    }

    return this.findById(saved.id) as Promise<CommuteRoute>;
  }

  async findById(id: string): Promise<CommuteRoute | undefined> {
    const entity = await this.routeRepository.findOne({
      where: { id },
      relations: ['checkpoints'],
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByIds(ids: string[]): Promise<CommuteRoute[]> {
    if (ids.length === 0) return [];
    const entities = await this.routeRepository.find({
      where: { id: In(ids) },
      relations: ['checkpoints'],
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserId(userId: string): Promise<CommuteRoute[]> {
    const entities = await this.routeRepository.find({
      where: { userId },
      relations: ['checkpoints'],
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserIdAndType(userId: string, routeType: RouteType): Promise<CommuteRoute[]> {
    const entities = await this.routeRepository.find({
      where: { userId, routeType },
      relations: ['checkpoints'],
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findPreferredByUserId(
    userId: string,
    routeType: RouteType
  ): Promise<CommuteRoute | undefined> {
    const entity = await this.routeRepository.findOne({
      where: { userId, routeType, isPreferred: true },
      relations: ['checkpoints'],
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async update(route: CommuteRoute): Promise<void> {
    const entity = this.toEntity(route);
    await this.routeRepository.save(entity);

    // Delete existing checkpoints and save new ones
    await this.checkpointRepository.delete({ routeId: route.id });
    if (route.checkpoints.length > 0) {
      const checkpointEntities = route.checkpoints.map((cp) => {
        const cpEntity = this.checkpointToEntity(cp);
        cpEntity.routeId = route.id;
        return cpEntity;
      });
      await this.checkpointRepository.save(checkpointEntities);
    }
  }

  async delete(id: string): Promise<void> {
    await this.routeRepository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.routeRepository.delete({ userId });
    return result.affected || 0;
  }

  private toEntity(route: CommuteRoute): CommuteRouteEntity {
    const entity = new CommuteRouteEntity();
    if (route.id) entity.id = route.id;
    entity.userId = route.userId;
    entity.name = route.name;
    entity.routeType = route.routeType;
    entity.isPreferred = route.isPreferred;
    entity.totalExpectedDuration = route.totalExpectedDuration;
    return entity;
  }

  private checkpointToEntity(checkpoint: RouteCheckpoint): RouteCheckpointEntity {
    const entity = new RouteCheckpointEntity();
    if (checkpoint.id) entity.id = checkpoint.id;
    entity.routeId = checkpoint.routeId;
    entity.sequenceOrder = checkpoint.sequenceOrder;
    entity.name = checkpoint.name;
    entity.checkpointType = checkpoint.checkpointType;
    entity.linkedStationId = checkpoint.linkedStationId;
    entity.linkedBusStopId = checkpoint.linkedBusStopId;
    entity.lineInfo = checkpoint.lineInfo;
    entity.expectedDurationToNext = checkpoint.expectedDurationToNext;
    entity.expectedWaitTime = checkpoint.expectedWaitTime;
    entity.transportMode = checkpoint.transportMode;
    return entity;
  }

  private toDomain(entity: CommuteRouteEntity): CommuteRoute {
    const checkpoints = (entity.checkpoints || [])
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map(
        (cpEntity) =>
          new RouteCheckpoint(cpEntity.sequenceOrder, cpEntity.name, cpEntity.checkpointType as CheckpointType, {
            id: cpEntity.id,
            routeId: cpEntity.routeId,
            linkedStationId: cpEntity.linkedStationId,
            linkedBusStopId: cpEntity.linkedBusStopId,
            lineInfo: cpEntity.lineInfo,
            expectedDurationToNext: cpEntity.expectedDurationToNext,
            expectedWaitTime: cpEntity.expectedWaitTime,
            transportMode: cpEntity.transportMode as TransportMode,
            createdAt: cpEntity.createdAt,
          })
      );

    return new CommuteRoute(entity.userId, entity.name, entity.routeType as RouteType, {
      id: entity.id,
      isPreferred: entity.isPreferred,
      totalExpectedDuration: entity.totalExpectedDuration,
      checkpoints,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
