import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ========== Query DTO ==========

export class WeeklyReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(4)
  weekOffset?: number;
}

// ========== Response DTOs (interfaces) ==========

export interface DailyStatsDto {
  date: string;
  dayOfWeek: number;
  dayName: string;
  sessionCount: number;
  averageDuration: number;
  totalDuration: number;
  averageDelay: number;
  averageWaitTime: number;
  weatherCondition: string | null;
}

export type TrendDirection = 'improving' | 'stable' | 'worsening';

export interface WeeklyReportResponseDto {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;

  totalSessions: number;
  totalRecordedDays: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;

  dailyStats: DailyStatsDto[];

  bestDay: DailyStatsDto | null;
  worstDay: DailyStatsDto | null;

  previousWeekAverage: number | null;
  changeFromPrevious: number | null;
  changePercentage: number | null;
  trend: TrendDirection | null;

  insights: string[];

  streakWeeklyCount: number;
  streakWeeklyGoal: number;
}
