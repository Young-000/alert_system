import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  PatternType,
  DayOfWeekDepartureValue,
  WeatherSensitivityValue,
  DEFAULT_PATTERNS,
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
  updatePosterior,
  credibleInterval,
  DEFAULT_PRIOR,
} from './statistics/bayesian-estimator';
import { mean, timeToMinutes, minutesToTime, clamp } from './statistics/descriptive-stats';
import { FeatureEngineeringService } from './feature-engineering.service';

export type PredictionTier = 'cold_start' | 'basic' | 'day_aware' | 'weather_aware' | 'full';

export interface ContributingFactor {
  type: 'day_of_week' | 'weather' | 'season' | 'transit_delay' | 'base_pattern';
  label: string;
  impact: number;
  description: string;
  confidence: number;
}

export interface PatternInsight {
  type: 'day_variation' | 'weather_sensitivity' | 'improving_trend'
    | 'route_bottleneck' | 'seasonal_shift';
  title: string;
  description: string;
  data?: Record<string, number>;
}

export interface PredictionResult {
  departureTime: string;
  departureRange: { early: string; late: string };
  confidence: number;
  tier: PredictionTier;
  factors: ContributingFactor[];
  insights: PatternInsight[];
  dataStatus: {
    totalRecords: number;
    recordsUsed: number;
    nextTierAt: number;
    nextTierName: string;
  };
}

export interface PredictionConditions {
  weather?: string;
  temperature?: number;
  transitDelayMinutes?: number;
  targetDate?: Date;
}

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const PREDICTION_ENGINE_SERVICE = Symbol('IPredictionEngineService');

@Injectable()
export class PredictionEngineService {
  private readonly logger = new Logger(PredictionEngineService.name);

  constructor(
    private readonly featureService: FeatureEngineeringService,
    @Optional()
    @Inject(USER_PATTERN_REPOSITORY)
    private readonly patternRepository?: IUserPatternRepository,
    @Optional()
    @Inject(COMMUTE_RECORD_REPOSITORY)
    private readonly commuteRepository?: ICommuteRecordRepository,
  ) {}

  /**
   * Generate a full prediction for a user.
   * Combines day-of-week, weather, Bayesian confidence, and transit delay.
   */
  async predict(
    userId: string,
    conditions?: PredictionConditions,
  ): Promise<PredictionResult> {
    const targetDate = conditions?.targetDate ?? new Date();
    const dayOfWeek = targetDate.getDay();

    // 1. Get record count & determine tier
    const records = this.commuteRepository
      ? await this.commuteRepository.findByUserIdAndType(userId, CommuteType.MORNING, 100)
      : [];

    const featureRows = this.featureService.transformRecordsToFeatureRows(records);
    const totalRecords = featureRows.length;
    const tier = this.determineTier(totalRecords);

    // 2. Get base departure using Bayesian estimation
    const departureTimes = featureRows.map(r => r.departureMinutes);
    const posterior = updatePosterior(DEFAULT_PRIOR, departureTimes);

    let baseDeparture = posterior.mu;
    const confidence = posterior.confidence;
    const factors: ContributingFactor[] = [];
    const insights: PatternInsight[] = [];

    // 3. Apply day-of-week adjustment if tier >= day_aware
    if (tier === 'day_aware' || tier === 'weather_aware' || tier === 'full') {
      const dayPattern = await this.getDayOfWeekPattern(userId);
      if (dayPattern) {
        const todaySegment = dayPattern.segments.find(s => s.dayOfWeek === dayOfWeek);
        if (todaySegment && todaySegment.sampleCount >= 2) {
          const overallMean = mean(departureTimes);
          const dayImpact = todaySegment.avgMinutes - overallMean;

          baseDeparture = todaySegment.avgMinutes;

          if (Math.abs(dayImpact) >= 1) {
            const dayName = DAY_NAMES_KO[dayOfWeek];
            factors.push({
              type: 'day_of_week',
              label: `${dayName}요일 패턴`,
              impact: Math.round(dayImpact),
              description: Math.abs(dayImpact) >= 2
                ? `${dayName}요일에는 평균 ${Math.abs(Math.round(dayImpact))}분 ${dayImpact > 0 ? '늦게' : '일찍'} 출발해요`
                : `${dayName}요일은 평소와 비슷해요`,
              confidence: clamp(todaySegment.sampleCount / 10, 0.3, 0.95),
            });
          }

          // Generate day variation insight
          this.addDayVariationInsight(dayPattern, insights);
        }
      }
    }

    // 4. Apply weather adjustment if tier >= weather_aware
    if (tier === 'weather_aware' || tier === 'full') {
      const weatherPattern = await this.getWeatherSensitivity(userId);
      const weatherFeatures = this.featureService.extractWeatherFeatures(
        conditions?.weather,
        conditions?.temperature,
      );

      if (weatherPattern) {
        let weatherImpact = 0;
        let weatherLabel = '';
        let weatherDesc = '';

        if (weatherFeatures.isSnowing) {
          weatherImpact = weatherPattern.snowCoefficient;
          weatherLabel = '눈 예보';
          weatherDesc = `눈 오는 날 ${Math.abs(Math.round(weatherImpact))}분 ${weatherImpact < 0 ? '일찍' : '늦게'} 출발하는 패턴`;
        } else if (weatherFeatures.isRaining) {
          weatherImpact = weatherPattern.rainCoefficient;
          weatherLabel = '비 예보';
          weatherDesc = `비 오는 날 ${Math.abs(Math.round(weatherImpact))}분 ${weatherImpact < 0 ? '일찍' : '늦게'} 출발하는 패턴`;
        }

        if (weatherFeatures.temperatureDeviation !== 0 && Math.abs(weatherPattern.temperatureCoefficient) > 0.1) {
          const tempImpact = weatherPattern.temperatureCoefficient * weatherFeatures.temperatureDeviation;
          weatherImpact += tempImpact;
        }

        if (Math.abs(weatherImpact) >= 1) {
          baseDeparture += weatherImpact;
          factors.push({
            type: 'weather',
            label: weatherLabel || '날씨 영향',
            impact: Math.round(weatherImpact),
            description: weatherDesc || `날씨로 인해 ${Math.abs(Math.round(weatherImpact))}분 조정`,
            confidence: clamp(weatherPattern.rSquared * 2, 0.3, 0.9),
          });
        }

        // Weather sensitivity insight
        this.addWeatherSensitivityInsight(weatherPattern, insights);
      } else {
        // Fallback to hardcoded weather adjustments
        this.applyDefaultWeatherAdjustments(
          conditions,
          factors,
          (impact) => { baseDeparture += impact; },
        );
      }
    } else if (conditions?.weather || conditions?.temperature !== undefined) {
      // Lower tiers still get basic weather adjustments
      this.applyDefaultWeatherAdjustments(
        conditions,
        factors,
        (impact) => { baseDeparture += impact; },
      );
    }

    // 5. Apply transit delay
    if (conditions?.transitDelayMinutes && conditions.transitDelayMinutes > 5) {
      const delayImpact = -conditions.transitDelayMinutes;
      baseDeparture += delayImpact;
      factors.push({
        type: 'transit_delay',
        label: '대중교통 지연',
        impact: delayImpact,
        description: `${conditions.transitDelayMinutes}분 지연으로 일찍 출발`,
        confidence: 0.9,
      });
    }

    // 6. Add base pattern factor
    if (factors.length === 0 || tier === 'basic') {
      factors.unshift({
        type: 'base_pattern',
        label: '기본 패턴',
        impact: 0,
        description: totalRecords > 0
          ? `${totalRecords}개 기록 기반 평균 출발 시간`
          : '기본 출발 시간 (데이터 수집 중)',
        confidence,
      });
    }

    // 7. Calculate confidence interval
    const ci = credibleInterval(posterior);
    const earlyMinutes = Math.min(ci.lower, baseDeparture - 5);
    const lateMinutes = Math.max(ci.upper, baseDeparture + 5);

    // 8. Build data status
    const { nextTierAt, nextTierName } = this.getNextTierInfo(totalRecords);

    return {
      departureTime: minutesToTime(Math.round(clamp(baseDeparture, 0, 1439))),
      departureRange: {
        early: minutesToTime(Math.round(clamp(earlyMinutes, 0, 1439))),
        late: minutesToTime(Math.round(clamp(lateMinutes, 0, 1439))),
      },
      confidence,
      tier,
      factors,
      insights,
      dataStatus: {
        totalRecords,
        recordsUsed: Math.min(totalRecords, 100),
        nextTierAt,
        nextTierName,
      },
    };
  }

  /**
   * Get insights for the detailed analysis page.
   */
  async getInsights(userId: string): Promise<{
    dayOfWeek: {
      segments: Array<{
        day: number;
        dayName: string;
        avgDepartureTime: string;
        sampleCount: number;
        stdDevMinutes: number;
      }>;
      mostConsistentDay: number;
      mostVariableDay: number;
    } | null;
    weatherImpact: {
      sensitivity: 'low' | 'medium' | 'high';
      coefficients: { rain: number; snow: number; temperature: number };
      description: string;
    } | null;
    overallStats: {
      totalRecords: number;
      trackingSince: string;
      avgDepartureTime: string;
      currentTier: string;
      predictionAccuracy: number;
    };
  }> {
    const records = this.commuteRepository
      ? await this.commuteRepository.findByUserIdAndType(userId, CommuteType.MORNING, 100)
      : [];

    const featureRows = this.featureService.transformRecordsToFeatureRows(records);
    const totalRecords = featureRows.length;
    const tier = this.determineTier(totalRecords);

    // Overall stats
    const departureTimes = featureRows.map(r => r.departureMinutes);
    const avgDeparture = totalRecords > 0 ? mean(departureTimes) : timeToMinutes('08:00');
    const earliest = records.length > 0
      ? records[records.length - 1].commuteDate.toISOString()
      : new Date().toISOString();

    // Day-of-week analysis
    let dayOfWeek = null;
    if (totalRecords >= 10) {
      const dayPattern = await this.getDayOfWeekPattern(userId);
      if (dayPattern && dayPattern.segments.length > 0) {
        const segments = dayPattern.segments.map(s => ({
          day: s.dayOfWeek,
          dayName: DAY_NAMES_KO[s.dayOfWeek] + '요일',
          avgDepartureTime: minutesToTime(s.avgMinutes),
          sampleCount: s.sampleCount,
          stdDevMinutes: s.stdDevMinutes,
        }));

        const withStdDev = dayPattern.segments.filter(s => s.sampleCount >= 2);
        const mostConsistent = withStdDev.length > 0
          ? withStdDev.reduce((min, s) => s.stdDevMinutes < min.stdDevMinutes ? s : min).dayOfWeek
          : 0;
        const mostVariable = withStdDev.length > 0
          ? withStdDev.reduce((max, s) => s.stdDevMinutes > max.stdDevMinutes ? s : max).dayOfWeek
          : 0;

        dayOfWeek = { segments, mostConsistentDay: mostConsistent, mostVariableDay: mostVariable };
      }
    }

    // Weather analysis
    let weatherImpact = null;
    if (totalRecords >= 20) {
      const weatherPattern = await this.getWeatherSensitivity(userId);
      if (weatherPattern) {
        const maxCoeff = Math.max(
          Math.abs(weatherPattern.rainCoefficient),
          Math.abs(weatherPattern.snowCoefficient),
        );
        const sensitivity: 'low' | 'medium' | 'high' =
          maxCoeff > 12 ? 'high' :
          maxCoeff > 5 ? 'medium' :
          'low';

        const rainDesc = weatherPattern.rainCoefficient !== 0
          ? `비 오는 날 평균 ${Math.abs(Math.round(weatherPattern.rainCoefficient))}분 ${weatherPattern.rainCoefficient < 0 ? '일찍' : '늦게'} 출발`
          : '비에 큰 영향 없음';

        weatherImpact = {
          sensitivity,
          coefficients: {
            rain: weatherPattern.rainCoefficient,
            snow: weatherPattern.snowCoefficient,
            temperature: weatherPattern.temperatureCoefficient,
          },
          description: rainDesc,
        };
      }
    }

    return {
      dayOfWeek,
      weatherImpact,
      overallStats: {
        totalRecords,
        trackingSince: earliest,
        avgDepartureTime: minutesToTime(Math.round(avgDeparture)),
        currentTier: tier,
        predictionAccuracy: this.estimateAccuracy(tier, totalRecords),
      },
    };
  }

  determineTier(recordCount: number): PredictionTier {
    if (recordCount < 5) return 'cold_start';
    if (recordCount < 10) return 'basic';
    if (recordCount < 20) return 'day_aware';
    if (recordCount < 30) return 'weather_aware';
    return 'full';
  }

  private getNextTierInfo(currentRecords: number): { nextTierAt: number; nextTierName: string } {
    if (currentRecords < 5) return { nextTierAt: 5, nextTierName: 'basic' };
    if (currentRecords < 10) return { nextTierAt: 10, nextTierName: 'day_aware' };
    if (currentRecords < 20) return { nextTierAt: 20, nextTierName: 'weather_aware' };
    if (currentRecords < 30) return { nextTierAt: 30, nextTierName: 'full' };
    return { nextTierAt: currentRecords, nextTierName: 'full' };
  }

  private async getDayOfWeekPattern(userId: string): Promise<DayOfWeekDepartureValue | null> {
    if (!this.patternRepository) return null;
    const pattern = await this.patternRepository.findByUserIdAndType(
      userId,
      PatternType.DAY_OF_WEEK_DEPARTURE,
    );
    return pattern ? (pattern.value as DayOfWeekDepartureValue) : null;
  }

  private async getWeatherSensitivity(userId: string): Promise<WeatherSensitivityValue | null> {
    if (!this.patternRepository) return null;
    const pattern = await this.patternRepository.findByUserIdAndType(
      userId,
      PatternType.WEATHER_SENSITIVITY,
    );
    return pattern ? (pattern.value as WeatherSensitivityValue) : null;
  }

  private applyDefaultWeatherAdjustments(
    conditions: PredictionConditions | undefined,
    factors: ContributingFactor[],
    applyImpact: (impact: number) => void,
  ): void {
    if (!conditions) return;

    const weatherStr = (conditions.weather ?? '').toLowerCase();
    const isRaining = weatherStr.includes('rain') || weatherStr.includes('비');
    const isSnowing = weatherStr.includes('snow') || weatherStr.includes('눈');

    if (isSnowing) {
      const impact = -DEFAULT_PATTERNS.weatherImpact.snow;
      applyImpact(impact);
      factors.push({
        type: 'weather',
        label: '눈 예보',
        impact,
        description: `눈으로 인해 ${DEFAULT_PATTERNS.weatherImpact.snow}분 일찍 출발`,
        confidence: 0.5,
      });
    } else if (isRaining) {
      const impact = -DEFAULT_PATTERNS.weatherImpact.rain;
      applyImpact(impact);
      factors.push({
        type: 'weather',
        label: '비 예보',
        impact,
        description: `비로 인해 ${DEFAULT_PATTERNS.weatherImpact.rain}분 일찍 출발`,
        confidence: 0.5,
      });
    }

    if (conditions.temperature !== undefined) {
      if (conditions.temperature < -10) {
        applyImpact(-5);
        factors.push({
          type: 'weather',
          label: '한파 주의',
          impact: -5,
          description: '한파로 인해 5분 일찍 출발',
          confidence: 0.5,
        });
      } else if (conditions.temperature > 35) {
        applyImpact(-5);
        factors.push({
          type: 'weather',
          label: '폭염 주의',
          impact: -5,
          description: '폭염으로 인해 5분 일찍 출발',
          confidence: 0.5,
        });
      }
    }
  }

  private addDayVariationInsight(
    dayPattern: DayOfWeekDepartureValue,
    insights: PatternInsight[],
  ): void {
    if (dayPattern.segments.length < 2) return;

    const weekdaySegments = dayPattern.segments.filter(s => s.dayOfWeek >= 1 && s.dayOfWeek <= 5);
    if (weekdaySegments.length < 2) return;

    const maxSegment = weekdaySegments.reduce((max, s) => s.avgMinutes > max.avgMinutes ? s : max);
    const minSegment = weekdaySegments.reduce((min, s) => s.avgMinutes < min.avgMinutes ? s : min);
    const diff = maxSegment.avgMinutes - minSegment.avgMinutes;

    if (diff >= 3) {
      const data: Record<string, number> = {};
      for (const seg of weekdaySegments) {
        data[DAY_NAMES_KO[seg.dayOfWeek]] = seg.avgMinutes;
      }

      insights.push({
        type: 'day_variation',
        title: `${DAY_NAMES_KO[maxSegment.dayOfWeek]}요일이 가장 여유로워요`,
        description: `${DAY_NAMES_KO[maxSegment.dayOfWeek]}요일 평균 출발: ${minutesToTime(maxSegment.avgMinutes)} (${DAY_NAMES_KO[minSegment.dayOfWeek]}요일보다 ${Math.round(diff)}분 늦음)`,
        data,
      });
    }
  }

  private addWeatherSensitivityInsight(
    weatherPattern: WeatherSensitivityValue,
    insights: PatternInsight[],
  ): void {
    const rainEffect = Math.abs(weatherPattern.rainCoefficient);
    if (rainEffect < 1) return;

    const level = rainEffect > 10 ? '높은' : rainEffect > 5 ? '보통의' : '낮은';
    insights.push({
      type: 'weather_sensitivity',
      title: `날씨에 ${level} 영향을 받아요`,
      description: `비 오는 날 평균 ${Math.round(rainEffect)}분 ${weatherPattern.rainCoefficient < 0 ? '일찍' : '늦게'} 출발`,
    });
  }

  private estimateAccuracy(tier: PredictionTier, recordCount: number): number {
    switch (tier) {
      case 'cold_start': return 30;
      case 'basic': return 50;
      case 'day_aware': return 65 + Math.min(10, recordCount - 10);
      case 'weather_aware': return 75 + Math.min(10, recordCount - 20);
      case 'full': return Math.min(95, 85 + Math.min(10, (recordCount - 30) / 5));
    }
  }
}
