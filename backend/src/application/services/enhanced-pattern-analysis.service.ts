import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  UserPattern,
  PatternType,
  DayOfWeekDepartureValue,
  WeatherSensitivityValue,
  SeasonalTrendValue,
  RouteSegmentStatsValue,
} from '@domain/entities/user-pattern.entity';
import { CommuteType } from '@domain/entities/commute-record.entity';
import {
  IUserPatternRepository,
  USER_PATTERN_REPOSITORY,
} from '@domain/repositories/user-pattern.repository';
import {
  ICommuteRecordRepository,
  COMMUTE_RECORD_REPOSITORY,
} from '@domain/repositories/commute-record.repository';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import { SessionStatus } from '@domain/entities/commute-session.entity';
import { FeatureEngineeringService } from './feature-engineering.service';
import { mean, stdDev } from './statistics/descriptive-stats';
import { linearRegression } from './statistics/linear-regression';

export const ENHANCED_PATTERN_ANALYSIS_SERVICE = Symbol('IEnhancedPatternAnalysisService');

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

@Injectable()
export class EnhancedPatternAnalysisService {
  private readonly logger = new Logger(EnhancedPatternAnalysisService.name);

  constructor(
    private readonly featureService: FeatureEngineeringService,
    @Optional()
    @Inject(USER_PATTERN_REPOSITORY)
    private readonly patternRepository?: IUserPatternRepository,
    @Optional()
    @Inject(COMMUTE_RECORD_REPOSITORY)
    private readonly commuteRepository?: ICommuteRecordRepository,
    @Optional()
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository?: ICommuteSessionRepository,
  ) {}

  /**
   * Analyze day-of-week departure patterns and store as UserPattern.
   * Requires 10+ records for meaningful segmentation.
   */
  async analyzeDayOfWeekPattern(
    userId: string,
    commuteType: CommuteType = CommuteType.MORNING,
  ): Promise<DayOfWeekDepartureValue | null> {
    if (!this.commuteRepository) return null;

    const records = await this.commuteRepository.findByUserIdAndType(userId, commuteType, 100);
    const rows = this.featureService.transformRecordsToFeatureRows(records);

    if (rows.length < 10) return null;

    const groups = this.featureService.groupByDayOfWeek(rows);
    const segments: DayOfWeekDepartureValue['segments'] = [];

    for (const [dayOfWeek, dayRows] of groups) {
      if (dayRows.length < 2) continue;

      const departures = dayRows.map(r => r.departureMinutes);
      segments.push({
        dayOfWeek,
        avgMinutes: Math.round(mean(departures)),
        stdDevMinutes: Math.round(stdDev(departures) * 10) / 10,
        sampleCount: dayRows.length,
      });
    }

    // Sort by dayOfWeek
    segments.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    const value: DayOfWeekDepartureValue = {
      segments,
      lastCalculated: new Date().toISOString(),
    };

    // Save to repository
    if (this.patternRepository) {
      await this.saveOrUpdatePattern(
        userId,
        PatternType.DAY_OF_WEEK_DEPARTURE,
        value,
        rows.length,
      );
    }

    return value;
  }

  /**
   * Analyze per-user weather sensitivity using OLS regression.
   * Requires 20+ records with 2+ distinct weather conditions.
   */
  async analyzeWeatherSensitivity(
    userId: string,
    commuteType: CommuteType = CommuteType.MORNING,
  ): Promise<WeatherSensitivityValue | null> {
    if (!this.commuteRepository) return null;

    const records = await this.commuteRepository.findByUserIdAndType(userId, commuteType, 100);
    const rows = this.featureService.transformRecordsToFeatureRows(records);

    if (rows.length < 20) return null;

    const variety = this.featureService.countWeatherVariety(rows);
    if (variety.totalDistinctConditions < 2) return null;

    const departures = rows.map(r => r.departureMinutes);
    const overallMean = mean(departures);

    const { X, Y } = this.featureService.buildWeatherRegressionData(rows, overallMean);

    // Check if temperature column has any variance; if not, exclude it
    // to prevent singular matrix issues
    const hasTempVariance = X.some(row => row[2] !== 0);
    const regressionX = hasTempVariance
      ? X
      : X.map(row => [row[0], row[1]]); // drop temperature column

    // addIntercept=false: Y is already mean-centered, intercept would be ~0
    const result = linearRegression(regressionX, Y, false);

    const rainCoeff = result.coefficients[0] ?? 0;
    const snowCoeff = result.coefficients[1] ?? 0;
    const tempCoeff = hasTempVariance ? (result.coefficients[2] ?? 0) : 0;

    const value: WeatherSensitivityValue = {
      rainCoefficient: Math.round(rainCoeff * 10) / 10,
      snowCoefficient: Math.round(snowCoeff * 10) / 10,
      temperatureCoefficient: Math.round(tempCoeff * 100) / 100,
      sampleCountRain: variety.rainCount,
      sampleCountSnow: variety.snowCount,
      sampleCountClear: variety.clearCount,
      rSquared: Math.round(result.rSquared * 1000) / 1000,
      lastCalculated: new Date().toISOString(),
    };

    if (this.patternRepository) {
      await this.saveOrUpdatePattern(
        userId,
        PatternType.WEATHER_SENSITIVITY,
        value,
        rows.length,
      );
    }

    return value;
  }

  /**
   * Analyze seasonal trends by grouping records by month.
   * Requires 30+ records spanning 2+ months.
   */
  async analyzeSeasonalTrend(
    userId: string,
    commuteType: CommuteType = CommuteType.MORNING,
  ): Promise<SeasonalTrendValue | null> {
    if (!this.commuteRepository) return null;

    const records = await this.commuteRepository.findByUserIdAndType(userId, commuteType, 100);
    const rows = this.featureService.transformRecordsToFeatureRows(records);

    if (rows.length < 30) return null;

    // Group by month
    const monthGroups = new Map<number, number[]>();
    for (const row of rows) {
      const month = row.commuteDate.getMonth() + 1; // 1-12
      const existing = monthGroups.get(month) ?? [];
      existing.push(row.departureMinutes);
      monthGroups.set(month, existing);
    }

    if (monthGroups.size < 2) return null;

    const monthlyAverages: SeasonalTrendValue['monthlyAverages'] = [];
    for (const [month, departures] of monthGroups) {
      monthlyAverages.push({
        month,
        avgMinutes: Math.round(mean(departures)),
        sampleCount: departures.length,
      });
    }
    monthlyAverages.sort((a, b) => a.month - b.month);

    // Calculate trend using simple linear regression on months
    const X = monthlyAverages.map(m => [m.month]);
    const Y = monthlyAverages.map(m => m.avgMinutes);
    const trend = linearRegression(X, Y);

    const trendSlope = trend.coefficients[0] || 0;
    const trendDirection: SeasonalTrendValue['trendDirection'] =
      trendSlope > 1 ? 'later' :
      trendSlope < -1 ? 'earlier' :
      'stable';

    const value: SeasonalTrendValue = {
      monthlyAverages,
      trendDirection,
      trendMinutesPerMonth: Math.round(trendSlope * 10) / 10,
      lastCalculated: new Date().toISOString(),
    };

    if (this.patternRepository) {
      await this.saveOrUpdatePattern(
        userId,
        PatternType.SEASONAL_TREND,
        value,
        rows.length,
      );
    }

    return value;
  }

  /**
   * Analyze route segment statistics from completed CommuteSession data.
   * Requires 5+ sessions for a specific route.
   */
  async analyzeRouteSegments(
    userId: string,
    routeId: string,
  ): Promise<RouteSegmentStatsValue | null> {
    if (!this.sessionRepository) return null;

    const sessions = await this.sessionRepository.findByRouteId(routeId, 50);
    const completedSessions = sessions.filter(
      s => s.userId === userId && s.status === SessionStatus.COMPLETED,
    );

    if (completedSessions.length < 5) return null;

    // Group checkpoint records by checkpointId
    const checkpointStats = new Map<string, {
      durations: number[];
      waitTimes: number[];
    }>();

    for (const session of completedSessions) {
      for (const record of session.checkpointRecords) {
        const existing = checkpointStats.get(record.checkpointId) ?? {
          durations: [],
          waitTimes: [],
        };
        if (record.durationFromPrevious !== undefined) {
          existing.durations.push(record.durationFromPrevious);
        }
        existing.waitTimes.push(record.actualWaitTime);
        checkpointStats.set(record.checkpointId, existing);
      }
    }

    const segments: RouteSegmentStatsValue['segments'] = [];
    for (const [checkpointId, stats] of checkpointStats) {
      if (stats.durations.length < 2) continue;
      segments.push({
        checkpointId,
        checkpointName: checkpointId, // Name can be resolved by caller
        avgDuration: Math.round(mean(stats.durations) * 10) / 10,
        stdDevDuration: Math.round(stdDev(stats.durations) * 10) / 10,
        avgWaitTime: Math.round(mean(stats.waitTimes) * 10) / 10,
        sampleCount: stats.durations.length,
      });
    }

    const value: RouteSegmentStatsValue = {
      routeId,
      segments,
      lastCalculated: new Date().toISOString(),
    };

    if (this.patternRepository) {
      await this.saveOrUpdatePattern(
        userId,
        PatternType.ROUTE_SEGMENT_STATS,
        value,
        completedSessions.length,
      );
    }

    return value;
  }

  /**
   * Run all analyses for a user. Called after a new commute record is saved.
   */
  async runFullAnalysis(userId: string, commuteType: CommuteType = CommuteType.MORNING): Promise<{
    dayOfWeek: DayOfWeekDepartureValue | null;
    weatherSensitivity: WeatherSensitivityValue | null;
    seasonalTrend: SeasonalTrendValue | null;
  }> {
    const [dayOfWeek, weatherSensitivity, seasonalTrend] = await Promise.all([
      this.analyzeDayOfWeekPattern(userId, commuteType),
      this.analyzeWeatherSensitivity(userId, commuteType),
      this.analyzeSeasonalTrend(userId, commuteType),
    ]);

    this.logger.log(
      `Analysis complete for user ${userId}: ` +
      `dayOfWeek=${dayOfWeek ? 'yes' : 'no'}, ` +
      `weather=${weatherSensitivity ? 'yes' : 'no'}, ` +
      `seasonal=${seasonalTrend ? 'yes' : 'no'}`,
    );

    return { dayOfWeek, weatherSensitivity, seasonalTrend };
  }

  /**
   * Get cached day-of-week pattern from repository.
   */
  async getCachedDayOfWeekPattern(userId: string): Promise<DayOfWeekDepartureValue | null> {
    if (!this.patternRepository) return null;

    const pattern = await this.patternRepository.findByUserIdAndType(
      userId,
      PatternType.DAY_OF_WEEK_DEPARTURE,
    );

    return pattern ? (pattern.value as DayOfWeekDepartureValue) : null;
  }

  /**
   * Get cached weather sensitivity from repository.
   */
  async getCachedWeatherSensitivity(userId: string): Promise<WeatherSensitivityValue | null> {
    if (!this.patternRepository) return null;

    const pattern = await this.patternRepository.findByUserIdAndType(
      userId,
      PatternType.WEATHER_SENSITIVITY,
    );

    return pattern ? (pattern.value as WeatherSensitivityValue) : null;
  }

  /**
   * Helper: get day name from dayOfWeek number.
   */
  getDayName(dayOfWeek: number): string {
    return DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
  }

  private async saveOrUpdatePattern(
    userId: string,
    patternType: PatternType,
    value: UserPattern['value'],
    sampleCount: number,
  ): Promise<void> {
    if (!this.patternRepository) return;

    const existing = await this.patternRepository.findByUserIdAndType(userId, patternType);

    if (existing) {
      const updated = existing.withUpdatedValue(value, sampleCount);
      await this.patternRepository.save(updated);
    } else {
      const newPattern = new UserPattern(userId, patternType, value, {
        confidence: UserPattern.calculateConfidence(sampleCount),
        sampleCount,
      });
      await this.patternRepository.save(newPattern);
    }
  }
}
