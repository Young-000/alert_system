import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RouteAnalyticsEntity } from '../typeorm/route-analytics.entity';
import { IRouteAnalyticsRepository } from '@domain/repositories/route-analytics.repository';
import { RouteAnalytics } from '@domain/entities/route-analytics.entity';

@Injectable()
export class RouteAnalyticsRepositoryImpl implements IRouteAnalyticsRepository {
  constructor(
    @InjectRepository(RouteAnalyticsEntity)
    private readonly repository: Repository<RouteAnalyticsEntity>,
  ) {}

  async save(analytics: RouteAnalytics): Promise<RouteAnalytics> {
    // 기존 데이터가 있으면 업데이트, 없으면 생성
    const existing = await this.repository.findOne({
      where: { routeId: analytics.routeId },
    });

    const entity = this.toEntity(analytics);
    if (existing) {
      entity.id = existing.id;
      entity.createdAt = existing.createdAt;
    }

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findByRouteId(routeId: string): Promise<RouteAnalytics | undefined> {
    const entity = await this.repository.findOne({
      where: { routeId },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string): Promise<RouteAnalytics[]> {
    // route 관계를 통해 userId로 필터링
    const entities = await this.repository
      .createQueryBuilder('analytics')
      .innerJoin('analytics.route', 'route')
      .where('route.user_id = :userId', { userId })
      .orderBy('analytics.totalScore', 'DESC')
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async findByRouteIds(routeIds: string[]): Promise<RouteAnalytics[]> {
    if (routeIds.length === 0) return [];

    const entities = await this.repository.find({
      where: { routeId: In(routeIds) },
      order: { totalScore: 'DESC' },
    });

    return entities.map((e) => this.toDomain(e));
  }

  async deleteByRouteId(routeId: string): Promise<void> {
    await this.repository.delete({ routeId });
  }

  async findTopScored(userId: string, limit: number): Promise<RouteAnalytics[]> {
    const entities = await this.repository
      .createQueryBuilder('analytics')
      .innerJoin('analytics.route', 'route')
      .where('route.user_id = :userId', { userId })
      .andWhere('analytics.totalTrips > 0')
      .orderBy('analytics.totalScore', 'DESC')
      .take(limit)
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  private toEntity(analytics: RouteAnalytics): RouteAnalyticsEntity {
    const entity = new RouteAnalyticsEntity();
    if (analytics.id) entity.id = analytics.id;
    entity.routeId = analytics.routeId;
    entity.routeName = analytics.routeName;
    entity.totalTrips = analytics.totalTrips;
    entity.lastTripDate = analytics.lastTripDate;

    // 시간 분석
    entity.avgDurationMinutes = analytics.duration.average;
    entity.minDurationMinutes = analytics.duration.min;
    entity.maxDurationMinutes = analytics.duration.max;
    entity.stdDevMinutes = analytics.duration.stdDev;

    // JSON 필드
    entity.segmentStats = analytics.segmentStats;
    entity.conditionAnalysis = analytics.conditionAnalysis;

    // 점수
    entity.speedScore = analytics.scoreFactors.speed;
    entity.reliabilityScore = analytics.scoreFactors.reliability;
    entity.comfortScore = analytics.scoreFactors.comfort;
    entity.totalScore = analytics.score;

    entity.lastCalculatedAt = analytics.lastCalculatedAt;

    return entity;
  }

  private toDomain(entity: RouteAnalyticsEntity): RouteAnalytics {
    return new RouteAnalytics(entity.routeId, entity.routeName, {
      id: entity.id,
      totalTrips: entity.totalTrips,
      lastTripDate: entity.lastTripDate,
      duration: {
        average: Number(entity.avgDurationMinutes),
        min: entity.minDurationMinutes,
        max: entity.maxDurationMinutes,
        stdDev: Number(entity.stdDevMinutes),
      },
      segmentStats: entity.segmentStats || [],
      conditionAnalysis: entity.conditionAnalysis || {
        byWeather: {},
        byDayOfWeek: {},
        byTimeSlot: {},
      },
      score: entity.totalScore,
      scoreFactors: {
        speed: entity.speedScore,
        reliability: entity.reliabilityScore,
        comfort: entity.comfortScore,
      },
      lastCalculatedAt: entity.lastCalculatedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
