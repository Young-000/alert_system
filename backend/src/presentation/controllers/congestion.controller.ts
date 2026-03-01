import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

    const limit = limitStr ? parseInt(limitStr, 10) : 50;

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
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculate(): Promise<RecalculateResponseDto> {
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
