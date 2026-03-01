import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';
import { UserPlaceEntity } from '@infrastructure/persistence/typeorm/user-place.entity';
import {
  IRegionalInsightRepository,
  REGIONAL_INSIGHT_REPOSITORY,
} from '@domain/repositories/regional-insight.repository';
import {
  RegionalInsight,
  PeakHourDistribution,
  toRegionId,
} from '@domain/entities/regional-insight.entity';
import { BayesianPrior, updatePosterior } from '@application/services/statistics/bayesian-estimator';
import { median } from '@application/services/statistics/descriptive-stats';
import { snapToGridCenter, toGridKey, mostCommonName } from './grid.util';

/**
 * Bayesian prior for regional commute duration estimation.
 * mu = 40 min (reasonable average commute in Seoul)
 * sigma = 20 (wide uncertainty)
 */
export const REGIONAL_DURATION_PRIOR: BayesianPrior = {
  mu: 40,
  sigma: 20,
};

/** Privacy threshold: minimum distinct users per region. */
const MIN_USERS_FOR_DISPLAY = 5;

/**
 * Raw observation from joining commute_sessions with route start/end checkpoints.
 */
interface RawSessionObservation {
  sessionId: string;
  userId: string;
  startedAt: Date;
  totalDurationMinutes: number;
  /** First checkpoint name (origin) */
  startCheckpointName: string;
  /** First checkpoint type */
  startCheckpointType: string;
}

/**
 * Geographic data from user_places for grid assignment.
 */
interface UserPlaceData {
  userId: string;
  latitude: number;
  longitude: number;
  placeType: string;
}

/**
 * Grouped data per region for aggregation.
 */
interface RegionGroup {
  gridKey: string;
  gridLat: number;
  gridLng: number;
  checkpointNames: string[];
  userIds: Set<string>;
  durations: number[];
  startHours: number[];
  /** Weekly buckets: durations from sessions within the last 7 days */
  currentWeekDurations: number[];
  /** Previous week durations (8-14 days ago) */
  previousWeekDurations: number[];
  /** Current month durations (last 30 days) */
  currentMonthDurations: number[];
  /** Previous month durations (31-60 days ago) */
  previousMonthDurations: number[];
}

@Injectable()
export class InsightsAggregationService {
  private readonly logger = new Logger(InsightsAggregationService.name);

  constructor(
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepo: Repository<CommuteSessionEntity>,
    @InjectRepository(RouteCheckpointEntity)
    private readonly checkpointRepo: Repository<RouteCheckpointEntity>,
    @InjectRepository(CheckpointRecordEntity)
    private readonly recordRepo: Repository<CheckpointRecordEntity>,
    @InjectRepository(UserPlaceEntity)
    private readonly userPlaceRepo: Repository<UserPlaceEntity>,
    @Inject(REGIONAL_INSIGHT_REPOSITORY)
    private readonly insightRepo: IRegionalInsightRepository,
  ) {}

  /**
   * Full recalculation: query all completed sessions, group by region,
   * apply Bayesian smoothing, compute trends, save results.
   */
  async recalculateAll(): Promise<{ regionCount: number; elapsed: number }> {
    const start = Date.now();
    this.logger.log('Starting full regional insights recalculation...');

    // Step 1: Fetch raw session observations
    const observations = await this.fetchAllObservations();
    this.logger.log(`Fetched ${observations.length} session observations`);

    if (observations.length === 0) {
      await this.insightRepo.deleteAll();
      return { regionCount: 0, elapsed: Date.now() - start };
    }

    // Step 2: Fetch user geographic data for grid assignment
    const userPlaces = await this.fetchUserPlaces();
    this.logger.log(`Fetched ${userPlaces.length} user places`);

    // Step 3: Group by region (grid-based)
    const groups = this.groupByRegion(observations, userPlaces);
    this.logger.log(`Grouped into ${groups.size} regions`);

    // Step 4: Compute insights with Bayesian smoothing
    const insights = this.computeInsights(groups);
    this.logger.log(`Computed ${insights.length} insights (privacy filtered)`);

    // Step 5: Clear old data and save new
    await this.insightRepo.deleteAll();
    await this.insightRepo.saveMany(insights);

    const elapsed = Date.now() - start;
    this.logger.log(`Full recalculation completed: ${insights.length} regions in ${elapsed}ms`);

    return { regionCount: insights.length, elapsed };
  }

  /**
   * Fetch all completed sessions with their start checkpoint info.
   */
  private async fetchAllObservations(): Promise<RawSessionObservation[]> {
    const results = await this.sessionRepo
      .createQueryBuilder('cs')
      .innerJoin(
        RouteCheckpointEntity,
        'rc',
        'rc.route_id = cs.route_id AND rc.sequence_order = 0',
      )
      .select([
        'cs.id AS "sessionId"',
        'cs.user_id AS "userId"',
        'cs.started_at AS "startedAt"',
        'cs.total_duration_minutes AS "totalDurationMinutes"',
        'rc.name AS "startCheckpointName"',
        'rc.checkpoint_type AS "startCheckpointType"',
      ])
      .where("cs.status = 'completed'")
      .andWhere('cs.total_duration_minutes IS NOT NULL')
      .andWhere('cs.total_duration_minutes > 0')
      .getRawMany();

    return results.map((r: Record<string, unknown>) => ({
      sessionId: r.sessionId as string,
      userId: r.userId as string,
      startedAt: new Date(r.startedAt as string),
      totalDurationMinutes: Number(r.totalDurationMinutes) || 0,
      startCheckpointName: (r.startCheckpointName as string) || '알 수 없음',
      startCheckpointType: (r.startCheckpointType as string) || 'custom',
    }));
  }

  /**
   * Fetch user places (home/work locations) for geographic grid assignment.
   */
  private async fetchUserPlaces(): Promise<UserPlaceData[]> {
    const results = await this.userPlaceRepo.find({
      where: { isActive: true },
      select: ['userId', 'latitude', 'longitude', 'placeType'],
    });

    return results.map((r: UserPlaceEntity) => ({
      userId: r.userId,
      latitude: r.latitude,
      longitude: r.longitude,
      placeType: r.placeType,
    }));
  }

  /**
   * Group observations by geographic region.
   *
   * Strategy:
   * 1. For each session, look up the user's "home" place for grid coordinates.
   * 2. If no user place found, use checkpoint name as a fallback region key.
   * 3. Group sessions into grid cells and track statistics.
   */
  private groupByRegion(
    observations: RawSessionObservation[],
    userPlaces: UserPlaceData[],
  ): Map<string, RegionGroup> {
    // Build user -> home place lookup
    const userHomeMap = new Map<string, UserPlaceData>();
    for (const place of userPlaces) {
      if (place.placeType === 'home') {
        userHomeMap.set(place.userId, place);
      }
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const groups = new Map<string, RegionGroup>();

    for (const obs of observations) {
      // Determine grid key
      const homePlace = userHomeMap.get(obs.userId);
      let gridKey: string;
      let gridLat: number;
      let gridLng: number;

      if (homePlace) {
        gridKey = toGridKey(homePlace.latitude, homePlace.longitude);
        gridLat = snapToGridCenter(homePlace.latitude);
        gridLng = snapToGridCenter(homePlace.longitude);
      } else {
        // Fallback: use checkpoint name-based key
        // Use fixed coordinates (Seoul center) with name-based offset
        const nameHash = this.simpleHash(obs.startCheckpointName);
        gridLat = 37.5 + (nameHash % 100) * 0.01;
        gridLng = 127.0 + (nameHash % 100) * 0.01;
        gridKey = `name_${obs.startCheckpointName}`;
      }

      let group = groups.get(gridKey);
      if (!group) {
        group = {
          gridKey,
          gridLat,
          gridLng,
          checkpointNames: [],
          userIds: new Set(),
          durations: [],
          startHours: [],
          currentWeekDurations: [],
          previousWeekDurations: [],
          currentMonthDurations: [],
          previousMonthDurations: [],
        };
        groups.set(gridKey, group);
      }

      group.checkpointNames.push(obs.startCheckpointName);
      group.userIds.add(obs.userId);
      group.durations.push(obs.totalDurationMinutes);
      group.startHours.push(obs.startedAt.getHours());

      // Classify into time buckets for trend calculation
      const sessionDate = obs.startedAt;
      if (sessionDate >= oneWeekAgo) {
        group.currentWeekDurations.push(obs.totalDurationMinutes);
      } else if (sessionDate >= twoWeeksAgo) {
        group.previousWeekDurations.push(obs.totalDurationMinutes);
      }

      if (sessionDate >= oneMonthAgo) {
        group.currentMonthDurations.push(obs.totalDurationMinutes);
      } else if (sessionDate >= twoMonthsAgo) {
        group.previousMonthDurations.push(obs.totalDurationMinutes);
      }
    }

    return groups;
  }

  /**
   * Compute regional insights from grouped data.
   * Applies privacy filter (N>=5 users) and Bayesian smoothing.
   */
  private computeInsights(groups: Map<string, RegionGroup>): RegionalInsight[] {
    const insights: RegionalInsight[] = [];

    for (const group of groups.values()) {
      // Privacy filter: only include regions with enough distinct users
      if (group.userIds.size < MIN_USERS_FOR_DISPLAY) {
        continue;
      }

      const insight = this.computeSingleInsight(group);
      insights.push(new RegionalInsight(insight));
    }

    return insights;
  }

  /**
   * Compute a single regional insight from a region group.
   */
  private computeSingleInsight(group: RegionGroup): {
    regionId: string;
    regionName: string;
    gridLat: number;
    gridLng: number;
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    userCount: number;
    sessionCount: number;
    peakHourDistribution: PeakHourDistribution;
    weekTrend: number;
    monthTrend: number;
    lastCalculatedAt: Date;
  } {
    // Apply Bayesian smoothing to duration values
    const posterior = updatePosterior(REGIONAL_DURATION_PRIOR, group.durations);

    // Calculate median duration
    const medianDuration = median(group.durations);

    // Region name from most common checkpoint name
    const regionName = mostCommonName(group.checkpointNames);

    // Region ID from grid key
    const regionId = group.gridKey.startsWith('grid_')
      ? group.gridKey
      : toRegionId(group.gridLat, group.gridLng);

    // Peak hour distribution (24-slot histogram)
    const peakHourDistribution: PeakHourDistribution = {};
    for (const hour of group.startHours) {
      peakHourDistribution[hour] = (peakHourDistribution[hour] || 0) + 1;
    }

    // Week-over-week trend (% change)
    const weekTrend = this.computeTrend(
      group.currentWeekDurations,
      group.previousWeekDurations,
    );

    // Month-over-month trend (% change)
    const monthTrend = this.computeTrend(
      group.currentMonthDurations,
      group.previousMonthDurations,
    );

    return {
      regionId,
      regionName,
      gridLat: group.gridLat,
      gridLng: group.gridLng,
      avgDurationMinutes: Math.round(posterior.mu * 100) / 100,
      medianDurationMinutes: Math.round(medianDuration * 100) / 100,
      userCount: group.userIds.size,
      sessionCount: group.durations.length,
      peakHourDistribution,
      weekTrend: Math.round(weekTrend * 100) / 100,
      monthTrend: Math.round(monthTrend * 100) / 100,
      lastCalculatedAt: new Date(),
    };
  }

  /**
   * Compute percentage change between current and previous period.
   * Returns 0 if insufficient data in either period.
   */
  private computeTrend(
    currentDurations: number[],
    previousDurations: number[],
  ): number {
    if (currentDurations.length === 0 || previousDurations.length === 0) {
      return 0;
    }

    const currentAvg =
      currentDurations.reduce((s, v) => s + v, 0) / currentDurations.length;
    const previousAvg =
      previousDurations.reduce((s, v) => s + v, 0) / previousDurations.length;

    if (previousAvg === 0) return 0;

    return ((currentAvg - previousAvg) / previousAvg) * 100;
  }

  /**
   * Simple hash function for strings -> number.
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
