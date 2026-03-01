import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IRegionalInsightRepository,
  REGIONAL_INSIGHT_REPOSITORY,
  InsightSortBy,
} from '@domain/repositories/regional-insight.repository';
import { classifyTrend } from '@domain/entities/regional-insight.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { UserPlaceEntity } from '@infrastructure/persistence/typeorm/user-place.entity';
import {
  RegionSummaryDto,
  RegionDetailDto,
  RegionTrendDto,
  PeakHoursDto,
  MyComparisonDto,
  RegionsListResponseDto,
} from '@application/dto/insights.dto';
import { toGridKey } from './grid.util';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    @Inject(REGIONAL_INSIGHT_REPOSITORY)
    private readonly insightRepo: IRegionalInsightRepository,
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepo: Repository<CommuteSessionEntity>,
    @InjectRepository(UserPlaceEntity)
    private readonly userPlaceRepo: Repository<UserPlaceEntity>,
  ) {}

  /**
   * Get list of regions with summary stats.
   */
  async getRegions(options: {
    sortBy?: InsightSortBy;
    limit?: number;
    offset?: number;
  }): Promise<RegionsListResponseDto> {
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = options.offset ?? 0;

    const [insights, total] = await Promise.all([
      this.insightRepo.findAll({
        sortBy: options.sortBy,
        limit,
        offset,
        minUserCount: 5,
      }),
      this.insightRepo.countAll(5),
    ]);

    const regions: RegionSummaryDto[] = insights.map((i) => ({
      regionId: i.regionId,
      regionName: i.regionName,
      avgDurationMinutes: i.avgDurationMinutes,
      medianDurationMinutes: i.medianDurationMinutes,
      userCount: i.userCount,
      sessionCount: i.sessionCount,
      weekTrend: i.weekTrend,
      weekTrendDirection: classifyTrend(i.weekTrend),
      peakHour: i.getPeakHour(),
      lastCalculatedAt: i.lastCalculatedAt.toISOString(),
    }));

    return {
      regions,
      meta: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed stats for a specific region.
   */
  async getRegionById(regionId: string): Promise<RegionDetailDto> {
    const insight = await this.insightRepo.findByRegionId(regionId);
    if (!insight) {
      throw new NotFoundException('지역 데이터를 찾을 수 없습니다.');
    }

    return {
      regionId: insight.regionId,
      regionName: insight.regionName,
      gridLat: insight.gridLat,
      gridLng: insight.gridLng,
      avgDurationMinutes: insight.avgDurationMinutes,
      medianDurationMinutes: insight.medianDurationMinutes,
      userCount: insight.userCount,
      sessionCount: insight.sessionCount,
      peakHourDistribution: insight.peakHourDistribution,
      weekTrend: insight.weekTrend,
      weekTrendDirection: insight.getWeekTrendDirection(),
      monthTrend: insight.monthTrend,
      monthTrendDirection: insight.getMonthTrendDirection(),
      peakHour: insight.getPeakHour(),
      lastCalculatedAt: insight.lastCalculatedAt.toISOString(),
    };
  }

  /**
   * Get trend data for a specific region.
   */
  async getRegionTrends(regionId: string): Promise<RegionTrendDto> {
    const insight = await this.insightRepo.findByRegionId(regionId);
    if (!insight) {
      throw new NotFoundException('지역 데이터를 찾을 수 없습니다.');
    }

    return {
      regionId: insight.regionId,
      regionName: insight.regionName,
      weekTrend: insight.weekTrend,
      weekTrendDirection: insight.getWeekTrendDirection(),
      monthTrend: insight.monthTrend,
      monthTrendDirection: insight.getMonthTrendDirection(),
      avgDurationMinutes: insight.avgDurationMinutes,
      lastCalculatedAt: insight.lastCalculatedAt.toISOString(),
    };
  }

  /**
   * Get peak hour distribution for a specific region.
   */
  async getRegionPeakHours(regionId: string): Promise<PeakHoursDto> {
    const insight = await this.insightRepo.findByRegionId(regionId);
    if (!insight) {
      throw new NotFoundException('지역 데이터를 찾을 수 없습니다.');
    }

    // Fill in all 24 hours with 0 as default
    const distribution: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      distribution[h] = insight.peakHourDistribution[h] || 0;
    }

    return {
      regionId: insight.regionId,
      regionName: insight.regionName,
      peakHourDistribution: distribution,
      peakHour: insight.getPeakHour(),
      totalSessions: insight.sessionCount,
      lastCalculatedAt: insight.lastCalculatedAt.toISOString(),
    };
  }

  /**
   * Compare user's commute stats with their region's average.
   */
  async getMyComparison(userId: string): Promise<MyComparisonDto> {
    // Step 1: Get user's average commute duration
    const userStats = await this.getUserStats(userId);

    // Step 2: Determine the user's region
    const userRegionId = await this.getUserRegionId(userId);

    // Step 3: Fetch regional stats
    let regionalAvg = 0;
    let regionalMedian = 0;
    let regionName = '알 수 없는 지역';
    let regionUserCount = 0;
    let regionId: string | null = null;

    if (userRegionId) {
      const insight = await this.insightRepo.findByRegionId(userRegionId);
      if (insight && insight.meetsPrivacyThreshold()) {
        regionalAvg = insight.avgDurationMinutes;
        regionalMedian = insight.medianDurationMinutes;
        regionName = insight.regionName;
        regionUserCount = insight.userCount;
        regionId = insight.regionId;
      }
    }

    // Step 4: Compute difference
    const diffMinutes = userStats.avgDuration - regionalAvg;
    const diffPercent = regionalAvg > 0
      ? ((userStats.avgDuration - regionalAvg) / regionalAvg) * 100
      : 0;

    return {
      userId,
      userAvgDurationMinutes: Math.round(userStats.avgDuration * 100) / 100,
      userSessionCount: userStats.sessionCount,
      regionId,
      regionName,
      regionAvgDurationMinutes: Math.round(regionalAvg * 100) / 100,
      regionMedianDurationMinutes: Math.round(regionalMedian * 100) / 100,
      regionUserCount,
      diffMinutes: Math.round(diffMinutes * 100) / 100,
      diffPercent: Math.round(diffPercent * 100) / 100,
      fasterThanRegion: diffMinutes < 0,
    };
  }

  /**
   * Get user's commute stats from their sessions.
   */
  private async getUserStats(userId: string): Promise<{
    avgDuration: number;
    sessionCount: number;
  }> {
    const result = await this.sessionRepo
      .createQueryBuilder('cs')
      .select([
        'AVG(cs.total_duration_minutes) AS "avgDuration"',
        'COUNT(*) AS "sessionCount"',
      ])
      .where('cs.user_id = :userId', { userId })
      .andWhere("cs.status = 'completed'")
      .andWhere('cs.total_duration_minutes IS NOT NULL')
      .andWhere('cs.total_duration_minutes > 0')
      .getRawOne();

    return {
      avgDuration: Number(result?.avgDuration) || 0,
      sessionCount: Number(result?.sessionCount) || 0,
    };
  }

  /**
   * Determine the user's region based on their home place.
   */
  private async getUserRegionId(userId: string): Promise<string | null> {
    const homePlace = await this.userPlaceRepo.findOne({
      where: { userId, placeType: 'home', isActive: true },
    });

    if (homePlace) {
      return toGridKey(homePlace.latitude, homePlace.longitude);
    }

    return null;
  }
}
