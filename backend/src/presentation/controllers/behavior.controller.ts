import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  TrackBehaviorUseCase,
  TrackDepartureDto,
} from '@application/use-cases/track-behavior.use-case';
import {
  PredictOptimalDepartureUseCase,
  CurrentConditions,
  DeparturePrediction,
} from '@application/use-cases/predict-optimal-departure.use-case';
import { BehaviorEventType } from '@domain/entities/behavior-event.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';
import { UserPattern } from '@domain/entities/user-pattern.entity';
import { CommuteRecord } from '@domain/entities/commute-record.entity';

interface TrackEventDto {
  userId: string;
  eventType: string;
  alertId?: string;
  metadata?: Record<string, unknown>;
  source?: 'push' | 'app';
}

interface DepartureConfirmedDto {
  userId: string;
  alertId: string;
  source: 'push' | 'app';
  weatherCondition?: string;
  transitDelayMinutes?: number;
}

@Controller('behavior')
export class BehaviorController {
  private readonly logger = new Logger(BehaviorController.name);

  constructor(
    private readonly trackBehaviorUseCase: TrackBehaviorUseCase,
    @Optional()
    private readonly predictOptimalDepartureUseCase: PredictOptimalDepartureUseCase | null,
    @Optional()
    @Inject('USER_PATTERN_REPOSITORY')
    private readonly userPatternRepository: IUserPatternRepository | null,
    @Optional()
    @Inject('COMMUTE_RECORD_REPOSITORY')
    private readonly commuteRecordRepository: ICommuteRecordRepository | null,
  ) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  async trackEvent(@Body() dto: TrackEventDto): Promise<{ success: boolean }> {
    const eventType = this.mapEventType(dto.eventType);
    if (!eventType) {
      this.logger.warn(`Unknown event type: ${dto.eventType}`);
      return { success: false };
    }

    await this.trackBehaviorUseCase.trackEvent({
      userId: dto.userId,
      eventType,
      alertId: dto.alertId,
      metadata: dto.metadata,
      source: dto.source,
    });

    return { success: true };
  }

  @Post('departure-confirmed')
  @HttpCode(HttpStatus.OK)
  async confirmDeparture(
    @Body() dto: DepartureConfirmedDto
  ): Promise<{ success: boolean }> {
    const trackDto: TrackDepartureDto = {
      userId: dto.userId,
      alertId: dto.alertId,
      source: dto.source,
      weatherCondition: dto.weatherCondition,
      transitDelayMinutes: dto.transitDelayMinutes,
    };

    await this.trackBehaviorUseCase.trackDepartureConfirmation(trackDto);

    this.logger.log(`Departure confirmed: user=${dto.userId}, alert=${dto.alertId}`);
    return { success: true };
  }

  @Post('notification-opened')
  @HttpCode(HttpStatus.OK)
  async notificationOpened(
    @Body() dto: { userId: string; alertId: string; notificationId?: string }
  ): Promise<{ success: boolean }> {
    await this.trackBehaviorUseCase.trackNotificationOpened(
      dto.userId,
      dto.alertId,
      dto.notificationId
    );

    return { success: true };
  }

  /**
   * 사용자의 학습된 패턴 조회
   */
  @Get('patterns/:userId')
  async getUserPatterns(
    @Param('userId') userId: string,
  ): Promise<{ patterns: UserPattern[]; message?: string }> {
    if (!this.userPatternRepository) {
      return { patterns: [], message: 'Pattern repository not available' };
    }

    const patterns = await this.userPatternRepository.findByUserId(userId);
    return { patterns };
  }

  /**
   * 사용자의 출퇴근 기록 조회
   */
  @Get('commute-history/:userId')
  async getCommuteHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<{ records: CommuteRecord[]; message?: string }> {
    if (!this.commuteRecordRepository) {
      return { records: [], message: 'Commute record repository not available' };
    }

    const recordLimit = limit ? parseInt(limit, 10) : 30;
    const records = await this.commuteRecordRepository.findByUserId(userId, recordLimit);
    return { records };
  }

  /**
   * 최적 출발 시간 예측
   */
  @Get('optimal-departure/:userId/:alertId')
  async predictOptimalDeparture(
    @Param('userId') userId: string,
    @Param('alertId') alertId: string,
    @Query('weather') weather?: string,
    @Query('transitDelay') transitDelay?: string,
    @Query('isRaining') isRaining?: string,
    @Query('temperature') temperature?: string,
  ): Promise<DeparturePrediction | { error: string }> {
    if (!this.predictOptimalDepartureUseCase) {
      return { error: 'Prediction service not available' };
    }

    const conditions: CurrentConditions = {};
    if (weather) conditions.weather = weather;
    if (transitDelay) conditions.transitDelayMinutes = parseInt(transitDelay, 10);
    if (isRaining) conditions.isRaining = isRaining === 'true';
    if (temperature) conditions.temperature = parseInt(temperature, 10);

    return this.predictOptimalDepartureUseCase.execute(userId, alertId, conditions);
  }

  /**
   * 사용자 행동 분석 요약
   */
  @Get('analytics/:userId')
  async getBehaviorAnalytics(
    @Param('userId') userId: string,
  ): Promise<{
    totalPatterns: number;
    totalCommuteRecords: number;
    averageConfidence: number;
    hasEnoughData: boolean;
  }> {
    const patterns = this.userPatternRepository
      ? await this.userPatternRepository.findByUserId(userId)
      : [];
    const commuteRecords = this.commuteRecordRepository
      ? await this.commuteRecordRepository.findByUserId(userId, 100)
      : [];

    const averageConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0;

    return {
      totalPatterns: patterns.length,
      totalCommuteRecords: commuteRecords.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      hasEnoughData: commuteRecords.length >= 5,
    };
  }

  private mapEventType(type: string): BehaviorEventType | null {
    const mapping: Record<string, BehaviorEventType> = {
      notification_received: BehaviorEventType.NOTIFICATION_RECEIVED,
      notification_opened: BehaviorEventType.NOTIFICATION_OPENED,
      notification_dismissed: BehaviorEventType.NOTIFICATION_DISMISSED,
      departure_confirmed: BehaviorEventType.DEPARTURE_CONFIRMED,
      transit_info_viewed: BehaviorEventType.TRANSIT_INFO_VIEWED,
      alert_created: BehaviorEventType.ALERT_CREATED,
      alert_modified: BehaviorEventType.ALERT_MODIFIED,
    };

    return mapping[type] || null;
  }
}
