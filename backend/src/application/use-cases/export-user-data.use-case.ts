import { Injectable, Inject, Optional, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { IAlertRepository } from '../../domain/repositories/alert.repository';
import { IBehaviorEventRepository } from '../../domain/repositories/behavior-event.repository';
import { ICommuteRecordRepository } from '../../domain/repositories/commute-record.repository';
import { IUserPatternRepository } from '../../domain/repositories/user-pattern.repository';
import { Alert } from '../../domain/entities/alert.entity';
import { BehaviorEvent } from '../../domain/entities/behavior-event.entity';
import { CommuteRecord } from '../../domain/entities/commute-record.entity';
import { UserPattern } from '../../domain/entities/user-pattern.entity';

export interface ExportedUserData {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    location?: {
      address: string;
      lat: number;
      lng: number;
    };
    createdAt: string;
  };
  alerts: Array<{
    id: string;
    name: string;
    schedule: string;
    alertTypes: string[];
    enabled: boolean;
    busStopId?: string;
    subwayStationId?: string;
    smartSchedulingEnabled: boolean;
  }>;
  behaviorEvents: Array<{
    eventType: string;
    timestamp: string;
    alertId?: string;
    dayOfWeek: number;
    metadata?: Record<string, unknown>;
  }>;
  commuteRecords: Array<{
    commuteDate: string;
    commuteType: string;
    scheduledDeparture?: string;
    actualDeparture?: string;
    weatherCondition?: string;
    transitDelayMinutes?: number;
  }>;
  patterns: Array<{
    patternType: string;
    dayOfWeek?: number;
    isWeekday?: boolean;
    value: unknown;
    confidence: number;
    sampleCount: number;
  }>;
}

@Injectable()
export class ExportUserDataUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: IUserRepository,
    @Optional()
    @Inject('ALERT_REPOSITORY')
    private readonly alertRepository: IAlertRepository | null,
    @Optional()
    @Inject('BEHAVIOR_EVENT_REPOSITORY')
    private readonly behaviorEventRepository: IBehaviorEventRepository | null,
    @Optional()
    @Inject('COMMUTE_RECORD_REPOSITORY')
    private readonly commuteRecordRepository: ICommuteRecordRepository | null,
    @Optional()
    @Inject('USER_PATTERN_REPOSITORY')
    private readonly userPatternRepository: IUserPatternRepository | null,
  ) {}

  async execute(userId: string): Promise<ExportedUserData> {
    // Get user data
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    // Fetch all related data in parallel
    const [alerts, behaviorEvents, commuteRecords, patterns] = await Promise.all([
      this.alertRepository?.findByUserId(userId) ?? [],
      this.behaviorEventRepository?.findByUserId(userId) ?? [],
      this.commuteRecordRepository?.findByUserId(userId) ?? [],
      this.userPatternRepository?.findByUserId(userId) ?? [],
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        location: user.location,
        createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      },
      alerts: alerts.map((alert: Alert) => ({
        id: alert.id,
        name: alert.name,
        schedule: alert.schedule,
        alertTypes: alert.alertTypes,
        enabled: alert.enabled,
        busStopId: alert.busStopId,
        subwayStationId: alert.subwayStationId,
        smartSchedulingEnabled: alert.smartSchedulingEnabled ?? false,
      })),
      behaviorEvents: behaviorEvents.map((event: BehaviorEvent) => ({
        eventType: event.eventType,
        timestamp: event.timestamp.toISOString(),
        alertId: event.alertId,
        dayOfWeek: event.dayOfWeek,
        metadata: event.metadata,
      })),
      commuteRecords: commuteRecords.map((record: CommuteRecord) => ({
        commuteDate: record.commuteDate.toISOString().split('T')[0],
        commuteType: record.commuteType,
        scheduledDeparture: record.scheduledDeparture,
        actualDeparture: record.actualDeparture?.toISOString(),
        weatherCondition: record.weatherCondition,
        transitDelayMinutes: record.transitDelayMinutes,
      })),
      patterns: patterns.map((pattern: UserPattern) => ({
        patternType: pattern.patternType,
        dayOfWeek: pattern.dayOfWeek,
        isWeekday: pattern.isWeekday,
        value: pattern.value,
        confidence: pattern.confidence,
        sampleCount: pattern.sampleCount,
      })),
    };
  }
}
