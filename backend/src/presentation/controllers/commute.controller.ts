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
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('commute')
@UseGuards(AuthGuard('jwt'))
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
  async startSession(
    @Body() dto: StartSessionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SessionResponseDto> {
    // 권한 검사: 자신의 세션만 시작 가능
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션을 시작할 수 없습니다.');
    }
    this.logger.log(`Starting commute session for user ${dto.userId} on route ${dto.routeId}`);
    return this.manageSessionUseCase.startSession(dto);
  }

  /**
   * 체크포인트 도착 기록
   */
  @Post('checkpoint')
  @HttpCode(HttpStatus.OK)
  async recordCheckpoint(
    @Body() dto: RecordCheckpointDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SessionResponseDto> {
    // 권한 검사: 해당 세션이 본인의 것인지 확인
    const session = await this.manageSessionUseCase.getSessionById(dto.sessionId);
    if (session.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션에 접근할 수 없습니다.');
    }
    this.logger.log(`Recording checkpoint ${dto.checkpointId} for session ${dto.sessionId}`);
    return this.manageSessionUseCase.recordCheckpoint(dto);
  }

  /**
   * 통근 세션 완료 (도착)
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeSession(
    @Body() dto: CompleteSessionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SessionResponseDto> {
    // 권한 검사: 해당 세션이 본인의 것인지 확인
    const session = await this.manageSessionUseCase.getSessionById(dto.sessionId);
    if (session.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션을 완료할 수 없습니다.');
    }
    this.logger.log(`Completing session ${dto.sessionId}`);
    return this.manageSessionUseCase.completeSession(dto);
  }

  /**
   * 통근 세션 취소
   */
  @Post('cancel/:sessionId')
  @HttpCode(HttpStatus.OK)
  async cancelSession(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // 권한 검사: 해당 세션이 본인의 것인지 확인
    const session = await this.manageSessionUseCase.getSessionById(sessionId);
    if (session.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션을 취소할 수 없습니다.');
    }
    this.logger.log(`Cancelling session ${sessionId}`);
    await this.manageSessionUseCase.cancelSession(sessionId);
    return { success: true };
  }

  /**
   * 특정 세션 조회
   */
  @Get('session/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<SessionResponseDto> {
    const session = await this.manageSessionUseCase.getSessionById(sessionId);
    // 권한 검사: 본인의 세션만 조회 가능
    if (session.userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션을 조회할 수 없습니다.');
    }
    return session;
  }

  /**
   * 현재 진행 중인 세션 조회
   */
  @Get('in-progress/:userId')
  async getInProgressSession(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<SessionResponseDto | { session: null }> {
    // 권한 검사: 자신의 세션만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 세션 정보에 접근할 수 없습니다.');
    }
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
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<CommuteHistoryResponseDto> {
    // 권한 검사: 자신의 기록만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 통근 기록에 접근할 수 없습니다.');
    }
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
    @Query('days') days: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<CommuteStatsResponseDto> {
    // 권한 검사: 자신의 통계만 조회 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 통근 통계에 접근할 수 없습니다.');
    }
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.getStatsUseCase.execute(userId, daysNum);
  }
}
