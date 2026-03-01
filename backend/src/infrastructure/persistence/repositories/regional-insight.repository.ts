import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { RegionalInsightEntity } from '../typeorm/regional-insight.entity';
import {
  IRegionalInsightRepository,
  FindAllOptions,
  InsightSortBy,
} from '@domain/repositories/regional-insight.repository';
import {
  RegionalInsight,
  PeakHourDistribution,
} from '@domain/entities/regional-insight.entity';

@Injectable()
export class RegionalInsightRepositoryImpl implements IRegionalInsightRepository {
  constructor(
    @InjectRepository(RegionalInsightEntity)
    private readonly repository: Repository<RegionalInsightEntity>,
  ) {}

  async findByRegionId(regionId: string): Promise<RegionalInsight | null> {
    const entity = await this.repository.findOne({
      where: { regionId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: FindAllOptions): Promise<RegionalInsight[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const minUserCount = options?.minUserCount ?? 5;

    const sortColumn = this.toSortColumn(options?.sortBy);
    const sortOrder = options?.sortBy === 'avgDuration' ? 'ASC' : 'DESC';

    const entities = await this.repository.find({
      where: {
        userCount: MoreThanOrEqual(minUserCount),
      },
      order: { [sortColumn]: sortOrder },
      take: limit,
      skip: offset,
    });

    return entities.map((e: RegionalInsightEntity) => this.toDomain(e));
  }

  async countAll(minUserCount?: number): Promise<number> {
    const threshold = minUserCount ?? 5;
    return this.repository.count({
      where: {
        userCount: MoreThanOrEqual(threshold),
      },
    });
  }

  async save(insight: RegionalInsight): Promise<RegionalInsight> {
    const entity = this.toEntity(insight);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async saveMany(insights: RegionalInsight[]): Promise<void> {
    if (insights.length === 0) return;

    const entities = insights.map((i) => this.toEntity(i));
    const chunkSize = 100;
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      await this.repository.save(chunk);
    }
  }

  async deleteAll(): Promise<void> {
    await this.repository.clear();
  }

  private toSortColumn(sortBy?: InsightSortBy): string {
    switch (sortBy) {
      case 'userCount': return 'userCount';
      case 'sessionCount': return 'sessionCount';
      case 'avgDuration': return 'avgDurationMinutes';
      case 'regionName': return 'regionName';
      default: return 'sessionCount';
    }
  }

  private toDomain(entity: RegionalInsightEntity): RegionalInsight {
    let peakHourDistribution: PeakHourDistribution = {};
    try {
      peakHourDistribution = JSON.parse(entity.peakHourDistribution || '{}');
    } catch {
      peakHourDistribution = {};
    }

    return new RegionalInsight({
      id: entity.id,
      regionId: entity.regionId,
      regionName: entity.regionName,
      gridLat: entity.gridLat,
      gridLng: entity.gridLng,
      avgDurationMinutes: entity.avgDurationMinutes,
      medianDurationMinutes: entity.medianDurationMinutes,
      userCount: entity.userCount,
      sessionCount: entity.sessionCount,
      peakHourDistribution,
      weekTrend: entity.weekTrend,
      monthTrend: entity.monthTrend,
      lastCalculatedAt: entity.lastCalculatedAt,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(insight: RegionalInsight): RegionalInsightEntity {
    const entity = new RegionalInsightEntity();
    if (insight.id) entity.id = insight.id;
    entity.regionId = insight.regionId;
    entity.regionName = insight.regionName;
    entity.gridLat = insight.gridLat;
    entity.gridLng = insight.gridLng;
    entity.avgDurationMinutes = insight.avgDurationMinutes;
    entity.medianDurationMinutes = insight.medianDurationMinutes;
    entity.userCount = insight.userCount;
    entity.sessionCount = insight.sessionCount;
    entity.peakHourDistribution = JSON.stringify(insight.peakHourDistribution);
    entity.weekTrend = insight.weekTrend;
    entity.monthTrend = insight.monthTrend;
    entity.lastCalculatedAt = insight.lastCalculatedAt;
    return entity;
  }
}
