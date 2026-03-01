export enum PatternType {
  DEPARTURE_TIME = 'departure_time',
  ROUTE_PREFERENCE = 'route_preference',
  NOTIFICATION_LEAD_TIME = 'notification_lead_time',
  // P3-1: Enhanced pattern types
  DAY_OF_WEEK_DEPARTURE = 'day_of_week_departure',
  WEATHER_SENSITIVITY = 'weather_sensitivity',
  SEASONAL_TREND = 'seasonal_trend',
  ROUTE_SEGMENT_STATS = 'route_segment_stats',
}

export interface DepartureTimeValue {
  averageTime: string;  // "08:15" HH:mm format
  stdDevMinutes: number;
  earliestTime: string;
  latestTime: string;
}

export interface RoutePreferenceValue {
  preferredMode: 'bus' | 'subway' | 'both';
  busUsageRate: number;
  subwayUsageRate: number;
}

export interface NotificationLeadTimeValue {
  optimalMinutes: number;
  minMinutes: number;
  maxMinutes: number;
}

// P3-1: Enhanced pattern value types
export interface DayOfWeekDepartureValue {
  segments: Array<{
    dayOfWeek: number;       // 0=Sun, 1=Mon, ..., 6=Sat
    avgMinutes: number;      // average departure in minutes since midnight
    stdDevMinutes: number;
    sampleCount: number;
  }>;
  lastCalculated: string;    // ISO date
}

export interface WeatherSensitivityValue {
  rainCoefficient: number;       // minutes adjustment for rain
  snowCoefficient: number;       // minutes adjustment for snow
  temperatureCoefficient: number; // minutes per degree deviation
  sampleCountRain: number;
  sampleCountSnow: number;
  sampleCountClear: number;
  rSquared: number;              // model fit quality
  lastCalculated: string;
}

export interface SeasonalTrendValue {
  monthlyAverages: Array<{
    month: number;               // 1-12
    avgMinutes: number;
    sampleCount: number;
  }>;
  trendDirection: 'earlier' | 'later' | 'stable';
  trendMinutesPerMonth: number;
  lastCalculated: string;
}

export interface RouteSegmentStatsValue {
  routeId: string;
  segments: Array<{
    checkpointId: string;
    checkpointName: string;
    avgDuration: number;
    stdDevDuration: number;
    avgWaitTime: number;
    sampleCount: number;
  }>;
  lastCalculated: string;
}

export type PatternValue =
  | DepartureTimeValue
  | RoutePreferenceValue
  | NotificationLeadTimeValue
  | DayOfWeekDepartureValue
  | WeatherSensitivityValue
  | SeasonalTrendValue
  | RouteSegmentStatsValue;

// Confidence levels based on sample count
export const CONFIDENCE_LEVELS = {
  COLD_START: 0.3,      // 0-4 samples
  LEARNING: 0.5,        // 5-9 samples
  CONFIDENT: 0.7,       // 10-19 samples
  HIGH_CONFIDENCE: 0.85, // 20+ samples
} as const;

export class UserPattern {
  readonly id: string;
  readonly userId: string;
  readonly patternType: PatternType;
  readonly dayOfWeek?: number;
  readonly isWeekday?: boolean;
  readonly value: PatternValue;
  readonly confidence: number;
  readonly sampleCount: number;
  readonly lastUpdated: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    patternType: PatternType,
    value: PatternValue,
    options?: {
      id?: string;
      dayOfWeek?: number;
      isWeekday?: boolean;
      confidence?: number;
      sampleCount?: number;
      lastUpdated?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.patternType = patternType;
    this.dayOfWeek = options?.dayOfWeek;
    this.isWeekday = options?.isWeekday;
    this.value = value;
    this.confidence = options?.confidence ?? CONFIDENCE_LEVELS.COLD_START;
    this.sampleCount = options?.sampleCount ?? 0;
    this.lastUpdated = options?.lastUpdated || new Date();
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static calculateConfidence(sampleCount: number): number {
    if (sampleCount < 5) return CONFIDENCE_LEVELS.COLD_START;
    if (sampleCount < 10) return CONFIDENCE_LEVELS.LEARNING;
    if (sampleCount < 20) return CONFIDENCE_LEVELS.CONFIDENT;
    return CONFIDENCE_LEVELS.HIGH_CONFIDENCE;
  }

  withUpdatedValue(newValue: PatternValue, newSampleCount: number): UserPattern {
    return new UserPattern(this.userId, this.patternType, newValue, {
      id: this.id,
      dayOfWeek: this.dayOfWeek,
      isWeekday: this.isWeekday,
      confidence: UserPattern.calculateConfidence(newSampleCount),
      sampleCount: newSampleCount,
      lastUpdated: new Date(),
      createdAt: this.createdAt,
    });
  }
}

// Default patterns for cold start
export const DEFAULT_PATTERNS = {
  departureTime: {
    morning: { weekday: '08:00', weekend: '10:00' },
    evening: { weekday: '18:30' },
  },
  notificationLeadTime: 15,  // 15분 전
  weatherImpact: { rain: 10, snow: 15, hot: 5 },  // 분 단위 조정
} as const;
