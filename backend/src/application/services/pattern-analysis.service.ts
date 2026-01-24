import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  UserPattern,
  PatternType,
  DepartureTimeValue,
  NotificationLeadTimeValue,
  DEFAULT_PATTERNS,
  CONFIDENCE_LEVELS,
} from '@domain/entities/user-pattern.entity';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';
import {
  IUserPatternRepository,
  USER_PATTERN_REPOSITORY,
} from '@domain/repositories/user-pattern.repository';
import {
  ICommuteRecordRepository,
  COMMUTE_RECORD_REPOSITORY,
} from '@domain/repositories/commute-record.repository';

export interface DepartureTimePattern {
  averageTime: string;
  stdDevMinutes: number;
  confidence: number;
  sampleCount: number;
}

export interface IPatternAnalysisService {
  analyzeDeparturePattern(
    userId: string,
    commuteType: CommuteType,
    isWeekday: boolean
  ): Promise<DepartureTimePattern>;
  updatePatternFromRecord(record: CommuteRecord): Promise<void>;
  getOrCreatePattern(
    userId: string,
    patternType: PatternType,
    isWeekday?: boolean
  ): Promise<UserPattern>;
}

export const PATTERN_ANALYSIS_SERVICE = Symbol('IPatternAnalysisService');

@Injectable()
export class PatternAnalysisService implements IPatternAnalysisService {
  private readonly logger = new Logger(PatternAnalysisService.name);
  private readonly DECAY_FACTOR = 0.9; // 최신 데이터에 더 높은 가중치

  constructor(
    @Optional()
    @Inject(USER_PATTERN_REPOSITORY)
    private readonly patternRepository?: IUserPatternRepository,
    @Optional()
    @Inject(COMMUTE_RECORD_REPOSITORY)
    private readonly commuteRepository?: ICommuteRecordRepository,
  ) {}

  async analyzeDeparturePattern(
    userId: string,
    commuteType: CommuteType,
    isWeekday: boolean
  ): Promise<DepartureTimePattern> {
    // Get recent commute records
    const records = await this.getRecentRecords(userId, commuteType, isWeekday);

    if (records.length < 5) {
      // Cold start: use default patterns
      const defaultTime = this.getDefaultDepartureTime(commuteType, isWeekday);
      return {
        averageTime: defaultTime,
        stdDevMinutes: 15,
        confidence: CONFIDENCE_LEVELS.COLD_START,
        sampleCount: records.length,
      };
    }

    // Calculate weighted moving average
    const times = records
      .filter(r => r.actualDeparture)
      .map(r => this.timeToMinutes(r.getActualDepartureTime()!));

    const weightedAvg = this.calculateWeightedAverage(times);
    const stdDev = this.calculateStdDev(times, weightedAvg);
    const confidence = UserPattern.calculateConfidence(records.length);

    return {
      averageTime: this.minutesToTime(Math.round(weightedAvg)),
      stdDevMinutes: Math.round(stdDev),
      confidence,
      sampleCount: records.length,
    };
  }

  async updatePatternFromRecord(record: CommuteRecord): Promise<void> {
    if (!this.patternRepository || !record.actualDeparture) {
      return;
    }

    const isWeekday = record.commuteDate.getDay() >= 1 && record.commuteDate.getDay() <= 5;

    // Get existing pattern or create new
    const existingPattern = await this.patternRepository.findByUserIdTypeAndDay(
      record.userId,
      PatternType.DEPARTURE_TIME,
      undefined,
      isWeekday
    );

    const newPattern = await this.analyzeDeparturePattern(
      record.userId,
      record.commuteType,
      isWeekday
    );

    const patternValue: DepartureTimeValue = {
      averageTime: newPattern.averageTime,
      stdDevMinutes: newPattern.stdDevMinutes,
      earliestTime: this.minutesToTime(
        this.timeToMinutes(newPattern.averageTime) - newPattern.stdDevMinutes * 2
      ),
      latestTime: this.minutesToTime(
        this.timeToMinutes(newPattern.averageTime) + newPattern.stdDevMinutes * 2
      ),
    };

    if (existingPattern) {
      const updated = existingPattern.withUpdatedValue(patternValue, newPattern.sampleCount);
      await this.patternRepository.save(updated);
      this.logger.log(`Updated departure pattern for user ${record.userId}: ${newPattern.averageTime}`);
    } else {
      const newUserPattern = new UserPattern(
        record.userId,
        PatternType.DEPARTURE_TIME,
        patternValue,
        {
          isWeekday,
          confidence: newPattern.confidence,
          sampleCount: newPattern.sampleCount,
        }
      );
      await this.patternRepository.save(newUserPattern);
      this.logger.log(`Created departure pattern for user ${record.userId}: ${newPattern.averageTime}`);
    }
  }

  async getOrCreatePattern(
    userId: string,
    patternType: PatternType,
    isWeekday?: boolean
  ): Promise<UserPattern> {
    if (!this.patternRepository) {
      return this.createDefaultPattern(userId, patternType, isWeekday);
    }

    const existing = await this.patternRepository.findByUserIdTypeAndDay(
      userId,
      patternType,
      undefined,
      isWeekday
    );

    if (existing) {
      return existing;
    }

    return this.createDefaultPattern(userId, patternType, isWeekday);
  }

  private async getRecentRecords(
    userId: string,
    commuteType: CommuteType,
    isWeekday: boolean
  ): Promise<CommuteRecord[]> {
    if (!this.commuteRepository) {
      return [];
    }

    const records = await this.commuteRepository.findByUserIdAndType(userId, commuteType, 30);

    // Filter by weekday/weekend
    return records.filter(r => {
      const day = r.commuteDate.getDay();
      const recordIsWeekday = day >= 1 && day <= 5;
      return recordIsWeekday === isWeekday;
    });
  }

  private calculateWeightedAverage(values: number[]): number {
    if (values.length === 0) return 0;

    let weightedSum = 0;
    let weightSum = 0;

    // Apply exponential decay: most recent has highest weight
    for (let i = 0; i < values.length; i++) {
      const weight = Math.pow(this.DECAY_FACTOR, i);
      weightedSum += values[i] * weight;
      weightSum += weight;
    }

    return weightedSum / weightSum;
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 15; // default

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440; // Handle negative/overflow
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getDefaultDepartureTime(commuteType: CommuteType, isWeekday: boolean): string {
    if (commuteType === CommuteType.MORNING) {
      return isWeekday
        ? DEFAULT_PATTERNS.departureTime.morning.weekday
        : DEFAULT_PATTERNS.departureTime.morning.weekend;
    }
    return DEFAULT_PATTERNS.departureTime.evening.weekday;
  }

  private createDefaultPattern(
    userId: string,
    patternType: PatternType,
    isWeekday?: boolean
  ): UserPattern {
    let value: DepartureTimeValue | NotificationLeadTimeValue;

    if (patternType === PatternType.DEPARTURE_TIME) {
      const defaultTime = this.getDefaultDepartureTime(CommuteType.MORNING, isWeekday ?? true);
      value = {
        averageTime: defaultTime,
        stdDevMinutes: 15,
        earliestTime: this.minutesToTime(this.timeToMinutes(defaultTime) - 30),
        latestTime: this.minutesToTime(this.timeToMinutes(defaultTime) + 30),
      } as DepartureTimeValue;
    } else {
      value = {
        optimalMinutes: DEFAULT_PATTERNS.notificationLeadTime,
        minMinutes: 5,
        maxMinutes: 30,
      } as NotificationLeadTimeValue;
    }

    return new UserPattern(userId, patternType, value, {
      isWeekday,
      confidence: CONFIDENCE_LEVELS.COLD_START,
      sampleCount: 0,
    });
  }
}
