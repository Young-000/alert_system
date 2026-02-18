import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProcessCommuteEventUseCase } from '@application/use-cases/process-commute-event.use-case';
import {
  RecordCommuteEventDto,
  BatchCommuteEventsDto,
} from '@application/dto/commute-event.dto';
import type {
  CommuteEventResponseDto,
  BatchCommuteEventsResponseDto,
  CommuteEventListResponseDto,
} from '@application/dto/commute-event.dto';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('commute/events')
@UseGuards(AuthGuard('jwt'))
export class CommuteEventController {
  private readonly logger = new Logger(CommuteEventController.name);

  constructor(
    private readonly processCommuteEventUseCase: ProcessCommuteEventUseCase,
  ) {}

  /**
   * 출퇴근 이벤트 기록 (모바일에서 호출)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async recordEvent(
    @Body() dto: RecordCommuteEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CommuteEventResponseDto> {
    this.logger.log(
      `Recording commute event for user ${req.user.userId}: ${dto.eventType} at place ${dto.placeId}`
    );
    return this.processCommuteEventUseCase.processEvent(req.user.userId, dto);
  }

  /**
   * 오프라인 이벤트 일괄 전송
   */
  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async recordBatchEvents(
    @Body() dto: BatchCommuteEventsDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BatchCommuteEventsResponseDto> {
    this.logger.log(
      `Recording batch commute events for user ${req.user.userId}: ${dto.events.length} events`
    );
    return this.processCommuteEventUseCase.processBatch(req.user.userId, dto.events);
  }

  /**
   * 최근 이벤트 목록 조회
   */
  @Get()
  async getEvents(
    @Query('limit') limitStr: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<CommuteEventListResponseDto> {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.processCommuteEventUseCase.getEventsByUserId(req.user.userId, limit);
  }
}
