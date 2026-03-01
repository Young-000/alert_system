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
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  TrackBehaviorUseCase,
  TrackDepartureDto,
} from '@application/use-cases/track-behavior.use-case';
import {
  PredictOptimalDepartureUseCase,
  CurrentConditions,
  DeparturePrediction,
} from '@application/use-cases/predict-optimal-departure.use-case';
import {
  PredictionEngineService,
  PredictionResult,
} from '@application/services/prediction-engine.service';
import {
  EnhancedPatternAnalysisService,
} from '@application/services/enhanced-pattern-analysis.service';
import { BehaviorEventType } from '@domain/entities/behavior-event.entity';
import { IUserPatternRepository } from '@domain/repositories/user-pattern.repository';
import { ICommuteRecordRepository } from '@domain/repositories/commute-record.repository';
import { UserPattern } from '@domain/entities/user-pattern.entity';
import { CommuteRecord } from '@domain/entities/commute-record.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

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
@UseGuards(AuthGuard('jwt'))
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
    @Optional()
    @Inject(PredictionEngineService)
    private readonly predictionEngine: PredictionEngineService | null,
    @Optional()
    @Inject(EnhancedPatternAnalysisService)
    private readonly enhancedPatternAnalysis: EnhancedPatternAnalysisService | null,
  ) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // 권한 검사: 자신의 행동만 기록 가능
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 행동을 기록할 수 없습니다.');
    }
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
    @Body() dto: DepartureConfirmedDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // 권한 검사: 자신의 출발만 확인 가능
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 출발을 확인할 수 없습니다.');
    }
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
    @Body() dto: { userId: string; alertId: string; notificationId?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // 권한 검사: 자신의 알림 열기만 기록 가능
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 알림 기록에 접근할 수 없습니다.');
    }
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
    @Request() req: AuthenticatedRequest,
  ): Promise<{ patterns: UserPattern[]; message?: string }> {
    // 권한 검사: 자신의 패턴만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 패턴 정보에 접근할 수 없습니다.');
    }
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
    @Query('limit') limit: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ records: CommuteRecord[]; message?: string }> {
    // 권한 검사: 자신의 기록만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 통근 기록에 접근할 수 없습니다.');
    }
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
    @Query('weather') weather: string | undefined,
    @Query('transitDelay') transitDelay: string | undefined,
    @Query('isRaining') isRaining: string | undefined,
    @Query('temperature') temperature: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<DeparturePrediction | { error: string }> {
    // 권한 검사: 자신의 예측만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 예측 정보에 접근할 수 없습니다.');
    }
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
    @Request() req: AuthenticatedRequest,
  ): Promise<{
    totalPatterns: number;
    totalCommuteRecords: number;
    averageConfidence: number;
    hasEnoughData: boolean;
  }> {
    // 권한 검사: 자신의 분석만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 분석 정보에 접근할 수 없습니다.');
    }
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

  /**
   * ML 기반 출발 시간 예측 (5-tier Bayesian + 요일/날씨/대중교통)
   */
  @Get('predictions/:userId')
  async getPrediction(
    @Param('userId') userId: string,
    @Query('weather') weather: string | undefined,
    @Query('temperature') temperature: string | undefined,
    @Query('transitDelay') transitDelay: string | undefined,
    @Query('date') date: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<PredictionResult | { error: string }> {
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 예측 정보에 접근할 수 없습니다.');
    }
    if (!this.predictionEngine) {
      return { error: 'Prediction engine not available' };
    }

    const conditions: {
      weather?: string;
      temperature?: number;
      transitDelayMinutes?: number;
      targetDate?: Date;
    } = {};

    if (weather) conditions.weather = weather;
    if (temperature) conditions.temperature = parseInt(temperature, 10);
    if (transitDelay) conditions.transitDelayMinutes = parseInt(transitDelay, 10);
    if (date) conditions.targetDate = new Date(date);

    return this.predictionEngine.predict(userId, conditions);
  }

  /**
   * 패턴 인사이트 조회 (요일별, 날씨 영향, 전체 통계)
   */
  @Get('insights/:userId')
  async getInsights(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ReturnType<PredictionEngineService['getInsights']> | { error: string }> {
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 인사이트에 접근할 수 없습니다.');
    }
    if (!this.predictionEngine) {
      return { error: 'Prediction engine not available' };
    }

    return this.predictionEngine.getInsights(userId);
  }

  /**
   * 패턴 재분석 트리거 (수동 분석 요청)
   */
  @Post('analyze/:userId')
  @HttpCode(HttpStatus.OK)
  async triggerAnalysis(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 분석을 요청할 수 없습니다.');
    }
    if (!this.enhancedPatternAnalysis) {
      return { success: false, message: 'Analysis service not available' };
    }

    const result = await this.enhancedPatternAnalysis.runFullAnalysis(userId);

    return {
      success: true,
      message: `분석 완료: 요일=${result.dayOfWeek ? 'yes' : 'no'}, 날씨=${result.weatherSensitivity ? 'yes' : 'no'}, 계절=${result.seasonalTrend ? 'yes' : 'no'}`,
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
