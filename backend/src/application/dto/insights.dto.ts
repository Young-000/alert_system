import { TrendDirection, PeakHourDistribution } from '@domain/entities/regional-insight.entity';
import { InsightSortBy } from '@domain/repositories/regional-insight.repository';

// ========== GET /insights/regions ==========

export interface GetRegionsQueryDto {
  sortBy?: InsightSortBy;
  limit?: number;
  offset?: number;
}

export interface RegionSummaryDto {
  regionId: string;
  regionName: string;
  avgDurationMinutes: number;
  medianDurationMinutes: number;
  userCount: number;
  sessionCount: number;
  weekTrend: number;
  weekTrendDirection: TrendDirection;
  peakHour: number;
  lastCalculatedAt: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface RegionsListResponseDto {
  regions: RegionSummaryDto[];
  meta: PaginationMeta;
}

// ========== GET /insights/regions/:regionId ==========

export interface RegionDetailDto {
  regionId: string;
  regionName: string;
  gridLat: number;
  gridLng: number;
  avgDurationMinutes: number;
  medianDurationMinutes: number;
  userCount: number;
  sessionCount: number;
  peakHourDistribution: PeakHourDistribution;
  weekTrend: number;
  weekTrendDirection: TrendDirection;
  monthTrend: number;
  monthTrendDirection: TrendDirection;
  peakHour: number;
  lastCalculatedAt: string;
}

// ========== GET /insights/regions/:regionId/trends ==========

export interface RegionTrendDto {
  regionId: string;
  regionName: string;
  weekTrend: number;
  weekTrendDirection: TrendDirection;
  monthTrend: number;
  monthTrendDirection: TrendDirection;
  avgDurationMinutes: number;
  lastCalculatedAt: string;
}

// ========== GET /insights/regions/:regionId/peak-hours ==========

export interface PeakHoursDto {
  regionId: string;
  regionName: string;
  peakHourDistribution: Record<number, number>;
  peakHour: number;
  totalSessions: number;
  lastCalculatedAt: string;
}

// ========== GET /insights/me/comparison ==========

export interface MyComparisonDto {
  userId: string;
  userAvgDurationMinutes: number;
  userSessionCount: number;
  regionId: string | null;
  regionName: string;
  regionAvgDurationMinutes: number;
  regionMedianDurationMinutes: number;
  regionUserCount: number;
  diffMinutes: number;
  diffPercent: number;
  fasterThanRegion: boolean;
}

// ========== POST /insights/recalculate ==========

export interface InsightsRecalculateResponseDto {
  status: string;
  message: string;
  regionCount: number;
  elapsedMs: number;
}
