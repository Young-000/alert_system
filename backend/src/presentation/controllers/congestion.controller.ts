import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { CongestionService } from '@application/services/congestion/congestion.service';
import { CongestionAggregationService } from '@application/services/congestion/congestion-aggregation.service';
import {
  CongestionSegmentsResponseDto,
  RouteCongestionResponseDto,
  RecalculateResponseDto,
} from '@application/dto/congestion.dto';
import { CongestionLevel, TimeSlot, TIME_SLOTS } from '@domain/entities/segment-congestion.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('congestion')
@UseGuards(AuthGuard('jwt'))
export class CongestionController {
  private readonly logger = new Logger(CongestionController.name);

  constructor(
    private readonly congestionService: CongestionService,
    private readonly aggregationService: CongestionAggregationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List all segments with congestion data for a given time slot.
   */
  @Get('segments')
  async getSegments(
    @Query('timeSlot') timeSlot?: string,
    @Query('level') level?: string,
    @Query('limit') limitStr?: string,
  ): Promise<CongestionSegmentsResponseDto> {
    const validTimeSlot = timeSlot && TIME_SLOTS.includes(timeSlot as TimeSlot)
      ? (timeSlot as TimeSlot)
      : undefined;

    const validLevel = level && ['low', 'moderate', 'high', 'severe'].includes(level)
      ? (level as CongestionLevel)
      : undefined;

    const limit = limitStr ? (parseInt(limitStr, 10) || 50) : 50;

    return this.congestionService.getSegments({
      timeSlot: validTimeSlot,
      level: validLevel,
      limit: Math.min(limit, 200),
    });
  }

  /**
   * Get congestion overlay for a specific route's checkpoints.
   */
  @Get('routes/:routeId')
  async getRouteCongestion(
    @Param('routeId') routeId: string,
    @Query('timeSlot') timeSlot: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<RouteCongestionResponseDto> {
    const validTimeSlot = timeSlot && TIME_SLOTS.includes(timeSlot as TimeSlot)
      ? (timeSlot as TimeSlot)
      : undefined;

    return this.congestionService.getRouteCongestion(
      routeId,
      req.user.userId,
      validTimeSlot,
    );
  }

  /**
   * Trigger full recalculation of all congestion data.
   * Protected by scheduler secret header (admin-only operation), matching
   * POST /insights/recalculate — a JWT alone must not let any signed-in user
   * kick off a full-table aggregation.
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 300000 } })
  async recalculate(
    @Headers('x-scheduler-secret') schedulerSecret: string,
  ): Promise<RecalculateResponseDto> {
    const expectedSecret = this.configService.get<string>('SCHEDULER_SECRET');
    if (!expectedSecret || !schedulerSecret) {
      throw new UnauthorizedException('Authentication failed');
    }

    const expected = Buffer.from(expectedSecret, 'utf8');
    const received = Buffer.from(schedulerSecret, 'utf8');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      this.logger.warn('Invalid scheduler secret for congestion recalculate');
      throw new UnauthorizedException('Authentication failed');
    }

    this.logger.log('Triggering full congestion recalculation');

    const result = await this.aggregationService.recalculateAll();

    return {
      status: 'completed',
      message: 'Full recalculation completed',
      segmentCount: result.segmentCount,
      elapsedMs: result.elapsed,
    };
  }
}
