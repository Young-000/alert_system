import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
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

    // `checkpoint_records.checkpoint_id`는 `route_checkpoints(id) ON DELETE CASCADE`다
    // (20260208 마이그레이션 :108). 체크포인트를 통째로 지웠다가 같은 id로 다시 넣으면
    // 체크포인트는 멀쩡해 보이지만 그 경로의 도착 기록 전체가 조용히 사라진다.
    // 그래서 실제로 없어진 체크포인트만 지우고, 살아남는 것들은 save()로 UPDATE한다.
    const survivingIds = route.checkpoints
      .map((cp) => cp.id)
      .filter((id): id is string => !!id);

    await this.checkpointRepository.delete(
      survivingIds.length > 0
        ? { routeId: route.id, id: Not(In(survivingIds)) }
        : { routeId: route.id },
    );

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
