import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { BehaviorEvent, BehaviorEventType } from '@domain/entities/behavior-event.entity';
import { CommuteRecord } from '@domain/entities/commute-record.entity';
import {
  IBehaviorEventRepository,
  BEHAVIOR_EVENT_REPOSITORY,
} from '@domain/repositories/behavior-event.repository';
import {
  ICommuteRecordRepository,
  COMMUTE_RECORD_REPOSITORY,
} from '@domain/repositories/commute-record.repository';
import {
  IPatternAnalysisService,
  PATTERN_ANALYSIS_SERVICE,
} from '@application/services/pattern-analysis.service';

export interface TrackBehaviorDto {
  userId: string;
  eventType: BehaviorEventType;
  alertId?: string;
  metadata?: Record<string, unknown>;
  source?: 'push' | 'app';
}

export interface TrackDepartureDto {
  userId: string;
  alertId: string;
  source: 'push' | 'app';
  weatherCondition?: string;
  transitDelayMinutes?: number;
}

@Injectable()
export class TrackBehaviorUseCase {
  private readonly logger = new Logger(TrackBehaviorUseCase.name);

  constructor(
    @Optional()
    @Inject(BEHAVIOR_EVENT_REPOSITORY)
    private readonly behaviorRepository?: IBehaviorEventRepository,
    @Optional()
    @Inject(COMMUTE_RECORD_REPOSITORY)
    private readonly commuteRepository?: ICommuteRecordRepository,
    @Optional()
    @Inject(PATTERN_ANALYSIS_SERVICE)
    private readonly patternService?: IPatternAnalysisService,
  ) {}

  async trackEvent(dto: TrackBehaviorDto): Promise<void> {
    if (!this.behaviorRepository) {
      this.logger.warn('Behavior tracking disabled: repository not available');
      return;
    }

    const event = new BehaviorEvent(dto.userId, dto.eventType, {
      alertId: dto.alertId,
      metadata: {
        ...dto.metadata,
        source: dto.source,
      },
    });

    await this.behaviorRepository.save(event);
    this.logger.log(`Tracked event: ${dto.eventType} for user ${dto.userId}`);
  }

  async trackDepartureConfirmation(dto: TrackDepartureDto): Promise<void> {
    // 1. Track behavior event
    await this.trackEvent({
      userId: dto.userId,
      eventType: BehaviorEventType.DEPARTURE_CONFIRMED,
      alertId: dto.alertId,
      source: dto.source,
      metadata: {
        weatherCondition: dto.weatherCondition,
        transitDelayMinutes: dto.transitDelayMinutes,
      },
    });

    // 2. Create commute record
    if (this.commuteRepository) {
      const record = CommuteRecord.createFromDepartureConfirmation(
        dto.userId,
        dto.alertId,
        dto.weatherCondition,
        dto.transitDelayMinutes
      );
      await this.commuteRepository.save(record);
      this.logger.log(`Created commute record for user ${dto.userId}`);

      // 3. Update patterns
      if (this.patternService) {
        await this.patternService.updatePatternFromRecord(record);
      }
    }
  }

  async trackNotificationOpened(
    userId: string,
    alertId: string,
    notificationId?: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: BehaviorEventType.NOTIFICATION_OPENED,
      alertId,
      metadata: { notificationId },
    });
  }
}
