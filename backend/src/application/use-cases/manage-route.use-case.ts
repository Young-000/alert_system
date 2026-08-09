import { Injectable, Inject, Optional, NotFoundException } from '@nestjs/common';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  CommuteRoute,
  RouteCheckpoint,
  RouteType,
} from '@domain/entities/commute-route.entity';
import {
  CreateRouteDto,
  UpdateRouteDto,
  RouteResponseDto,
  CheckpointResponseDto,
} from '@application/dto/commute.dto';

@Injectable()
export class ManageRouteUseCase {
  constructor(
    @Optional()
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository?: ICommuteRouteRepository,
  ) {}

  async createRoute(dto: CreateRouteDto): Promise<RouteResponseDto> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const route = CommuteRoute.create(
      dto.userId,
      dto.name,
      dto.routeType,
      dto.checkpoints.map((cp) => ({
        sequenceOrder: cp.sequenceOrder,
        name: cp.name,
        checkpointType: cp.checkpointType,
        linkedStationId: cp.linkedStationId,
        linkedBusStopId: cp.linkedBusStopId,
        lineInfo: cp.lineInfo,
        expectedDurationToNext: cp.expectedDurationToNext,
        expectedWaitTime: cp.expectedWaitTime,
        transportMode: cp.transportMode,
      }))
    );

    // Handle isPreferred
    if (dto.isPreferred) {
      // Unset previous preferred route of same type
      const existingPreferred = await this.routeRepository.findPreferredByUserId(
        dto.userId,
        dto.routeType
      );
      if (existingPreferred) {
        await this.routeRepository.update(
          // isPreferred만 내리고 나머지는 그대로 — 사용자가 건드리지도 않은 경로다.
          // 특히 checkpoints의 id를 잃으면 저장 시 전부 새 체크포인트로 취급돼
          // ON DELETE CASCADE로 그 경로의 도착 기록까지 사라진다.
          new CommuteRoute(existingPreferred.userId, existingPreferred.name, existingPreferred.routeType, {
            id: existingPreferred.id,
            isPreferred: false,
            totalExpectedDuration: existingPreferred.totalExpectedDuration,
            checkpoints: existingPreferred.checkpoints,
            createdAt: existingPreferred.createdAt,
          })
        );
      }
    }

    const savedRoute = await this.routeRepository.save(
      new CommuteRoute(route.userId, route.name, route.routeType, {
        isPreferred: dto.isPreferred ?? false,
        totalExpectedDuration: route.totalExpectedDuration,
        checkpoints: route.checkpoints,
      })
    );

    return this.toResponseDto(savedRoute);
  }

  async getRouteById(id: string): Promise<RouteResponseDto> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    return this.toResponseDto(route);
  }

  async getRoutesByUserId(userId: string): Promise<RouteResponseDto[]> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const routes = await this.routeRepository.findByUserId(userId);
    return routes.map((r) => this.toResponseDto(r));
  }

  async getRoutesByUserIdAndType(userId: string, routeType: RouteType): Promise<RouteResponseDto[]> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const routes = await this.routeRepository.findByUserIdAndType(userId, routeType);
    return routes.map((r) => this.toResponseDto(r));
  }

  async updateRoute(id: string, dto: UpdateRouteDto): Promise<RouteResponseDto> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const existing = await this.routeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    // Build checkpoints if provided
    let checkpoints = existing.checkpoints;
    let totalExpectedDuration = existing.totalExpectedDuration;

    if (dto.checkpoints) {
      // id는 이 경로 소속인 것만 통과 — 남의 경로 체크포인트 id를 넣어
      // 그 행의 routeId를 가로채는 것을 막는다
      const ownedIds = new Set(existing.checkpoints.map((cp) => cp.id));
      checkpoints = dto.checkpoints.map(
        (cp) =>
          new RouteCheckpoint(cp.sequenceOrder, cp.name, cp.checkpointType, {
            id: cp.id && ownedIds.has(cp.id) ? cp.id : undefined,
            routeId: existing.id,
            linkedStationId: cp.linkedStationId,
            linkedBusStopId: cp.linkedBusStopId,
            lineInfo: cp.lineInfo,
            expectedDurationToNext: cp.expectedDurationToNext,
            expectedWaitTime: cp.expectedWaitTime,
            transportMode: cp.transportMode,
          })
      );
      totalExpectedDuration = checkpoints.reduce(
        (sum, cp) => sum + (cp.expectedDurationToNext || 0) + (cp.expectedWaitTime || 0),
        0
      );
    }

    // Handle isPreferred change.
    // routeType이 바뀌면 이미 대표이던 경로도 "새 타입의 대표"가 되므로,
    // 그 타입의 기존 대표를 해제해야 한다. 빠뜨리면 같은 타입에 대표가 둘 남고
    // findPreferredByUserId()(findOne)가 비결정적으로 하나를 고른다.
    const routeType = dto.routeType ?? existing.routeType;
    const becomesPreferred = dto.isPreferred ?? existing.isPreferred;
    const changesPreferredSlot = !existing.isPreferred || routeType !== existing.routeType;

    if (becomesPreferred && changesPreferredSlot) {
      const existingPreferred = await this.routeRepository.findPreferredByUserId(
        existing.userId,
        routeType
      );
      if (existingPreferred && existingPreferred.id !== id) {
        await this.routeRepository.update(
          // isPreferred만 내리고 나머지는 그대로 — 사용자가 건드리지도 않은 경로다.
          // 특히 checkpoints의 id를 잃으면 저장 시 전부 새 체크포인트로 취급돼
          // ON DELETE CASCADE로 그 경로의 도착 기록까지 사라진다.
          new CommuteRoute(existingPreferred.userId, existingPreferred.name, existingPreferred.routeType, {
            id: existingPreferred.id,
            isPreferred: false,
            totalExpectedDuration: existingPreferred.totalExpectedDuration,
            checkpoints: existingPreferred.checkpoints,
            createdAt: existingPreferred.createdAt,
          })
        );
      }
    }

    const updatedRoute = new CommuteRoute(
      existing.userId,
      dto.name ?? existing.name,
      dto.routeType ?? existing.routeType,
      {
        id: existing.id,
        isPreferred: dto.isPreferred ?? existing.isPreferred,
        totalExpectedDuration,
        checkpoints,
        createdAt: existing.createdAt,
      }
    );

    await this.routeRepository.update(updatedRoute);

    const savedRoute = await this.routeRepository.findById(id);
    return this.toResponseDto(savedRoute!);
  }

  async deleteRoute(id: string): Promise<void> {
    if (!this.routeRepository) {
      throw new Error('Route repository not available');
    }

    const existing = await this.routeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    await this.routeRepository.delete(id);
  }

  private toResponseDto(route: CommuteRoute): RouteResponseDto {
    return {
      id: route.id,
      userId: route.userId,
      name: route.name,
      routeType: route.routeType,
      isPreferred: route.isPreferred,
      totalExpectedDuration: route.totalExpectedDuration,
      totalTransferTime: route.getTotalTransferTime(),
      pureMovementTime: route.getPureMovementTime(),
      checkpoints: route.checkpoints.map((cp) => this.checkpointToResponseDto(cp)),
      createdAt: route.createdAt.toISOString(),
      updatedAt: route.updatedAt.toISOString(),
    };
  }

  private checkpointToResponseDto(checkpoint: RouteCheckpoint): CheckpointResponseDto {
    return {
      id: checkpoint.id,
      sequenceOrder: checkpoint.sequenceOrder,
      name: checkpoint.name,
      checkpointType: checkpoint.checkpointType,
      linkedStationId: checkpoint.linkedStationId,
      linkedBusStopId: checkpoint.linkedBusStopId,
      lineInfo: checkpoint.lineInfo,
      expectedDurationToNext: checkpoint.expectedDurationToNext,
      expectedWaitTime: checkpoint.expectedWaitTime,
      transportMode: checkpoint.transportMode,
      totalExpectedTime: checkpoint.getTotalExpectedTime(),
      isTransferRelated: checkpoint.isTransferRelated(),
    };
  }
}
