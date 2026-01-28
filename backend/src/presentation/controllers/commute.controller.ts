import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ManageCommuteSessionUseCase } from '@application/use-cases/manage-commute-session.use-case';
import { GetCommuteStatsUseCase } from '@application/use-cases/get-commute-stats.use-case';
import {
  StartSessionDto,
  RecordCheckpointDto,
  CompleteSessionDto,
  SessionResponseDto,
  CommuteHistoryResponseDto,
  CommuteStatsResponseDto,
} from '@application/dto/commute.dto';
import { Public } from '@infrastructure/auth/public.decorator';

@Controller('commute')
@Public()
export class CommuteController {
  private readonly logger = new Logger(CommuteController.name);

  constructor(
    private readonly manageSessionUseCase: ManageCommuteSessionUseCase,
    private readonly getStatsUseCase: GetCommuteStatsUseCase,
  ) {}

  /**
   * 통근 세션 시작 (출발)
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startSession(@Body() dto: StartSessionDto): Promise<SessionResponseDto> {
    this.logger.log(`Starting commute session for user ${dto.userId} on route ${dto.routeId}`);
    return this.manageSessionUseCase.startSession(dto);
  }

  /**
   * 체크포인트 도착 기록
   */
  @Post('checkpoint')
  @HttpCode(HttpStatus.OK)
  async recordCheckpoint(@Body() dto: RecordCheckpointDto): Promise<SessionResponseDto> {
    this.logger.log(`Recording checkpoint ${dto.checkpointId} for session ${dto.sessionId}`);
    return this.manageSessionUseCase.recordCheckpoint(dto);
  }

  /**
   * 통근 세션 완료 (도착)
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeSession(@Body() dto: CompleteSessionDto): Promise<SessionResponseDto> {
    this.logger.log(`Completing session ${dto.sessionId}`);
    return this.manageSessionUseCase.completeSession(dto);
  }

  /**
   * 통근 세션 취소
   */
  @Post('cancel/:sessionId')
  @HttpCode(HttpStatus.OK)
  async cancelSession(@Param('sessionId') sessionId: string): Promise<{ success: boolean }> {
    this.logger.log(`Cancelling session ${sessionId}`);
    await this.manageSessionUseCase.cancelSession(sessionId);
    return { success: true };
  }

  /**
   * 특정 세션 조회
   */
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string): Promise<SessionResponseDto> {
    return this.manageSessionUseCase.getSessionById(sessionId);
  }

  /**
   * 현재 진행 중인 세션 조회
   */
  @Get('in-progress/:userId')
  async getInProgressSession(
    @Param('userId') userId: string
  ): Promise<SessionResponseDto | { session: null }> {
    const session = await this.manageSessionUseCase.getInProgressSession(userId);
    if (!session) {
      return { session: null };
    }
    return session;
  }

  /**
   * 통근 기록 조회 (히스토리)
   */
  @Get('history/:userId')
  async getHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<CommuteHistoryResponseDto> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.manageSessionUseCase.getHistory(userId, limitNum, offsetNum);
  }

  /**
   * 통근 통계 조회
   */
  @Get('stats/:userId')
  async getStats(
    @Param('userId') userId: string,
    @Query('days') days?: string
  ): Promise<CommuteStatsResponseDto> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.getStatsUseCase.execute(userId, daysNum);
  }
}
