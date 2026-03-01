import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InsightsService } from '@application/services/insights/insights.service';
import { InsightsAggregationService } from '@application/services/insights/insights-aggregation.service';
import {
  RegionsListResponseDto,
  RegionDetailDto,
  RegionTrendDto,
  PeakHoursDto,
  MyComparisonDto,
  InsightsRecalculateResponseDto,
} from '@application/dto/insights.dto';
import { InsightSortBy } from '@domain/repositories/regional-insight.repository';
import { Public } from '@infrastructure/auth/public.decorator';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

const VALID_SORT_BY: InsightSortBy[] = ['userCount', 'sessionCount', 'avgDuration', 'regionName'];

@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);

  constructor(
    private readonly insightsService: InsightsService,
    private readonly aggregationService: InsightsAggregationService,
  ) {}

  /**
   * List all regions with summary stats (public, no auth needed).
   */
  @Public()
  @Get('regions')
  async getRegions(
    @Query('sortBy') sortBy?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<RegionsListResponseDto> {
    const validSortBy = sortBy && VALID_SORT_BY.includes(sortBy as InsightSortBy)
      ? (sortBy as InsightSortBy)
      : undefined;

    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    return this.insightsService.getRegions({
      sortBy: validSortBy,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });
  }

  /**
   * Get detailed stats for a specific region (public).
   */
  @Public()
  @Get('regions/:regionId')
  async getRegionDetail(
    @Param('regionId') regionId: string,
  ): Promise<RegionDetailDto> {
    return this.insightsService.getRegionById(regionId);
  }

  /**
   * Get trend data for a specific region (public).
   */
  @Public()
  @Get('regions/:regionId/trends')
  async getRegionTrends(
    @Param('regionId') regionId: string,
  ): Promise<RegionTrendDto> {
    return this.insightsService.getRegionTrends(regionId);
  }

  /**
   * Get peak hour distribution for a specific region (public).
   */
  @Public()
  @Get('regions/:regionId/peak-hours')
  async getRegionPeakHours(
    @Param('regionId') regionId: string,
  ): Promise<PeakHoursDto> {
    return this.insightsService.getRegionPeakHours(regionId);
  }

  /**
   * Compare user's stats with their regional average (requires auth).
   */
  @Get('me/comparison')
  async getMyComparison(
    @Request() req: AuthenticatedRequest,
  ): Promise<MyComparisonDto> {
    return this.insightsService.getMyComparison(req.user.userId);
  }

  /**
   * Trigger full recalculation of all regional insights (requires auth).
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 300000 } })
  async recalculate(): Promise<InsightsRecalculateResponseDto> {
    this.logger.log('Triggering full regional insights recalculation');

    const result = await this.aggregationService.recalculateAll();

    return {
      status: 'completed',
      message: 'Full regional insights recalculation completed',
      regionCount: result.regionCount,
      elapsedMs: result.elapsed,
    };
  }
}
