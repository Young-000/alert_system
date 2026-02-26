import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { MilestoneType, StreakStatus, NextMilestoneInfo } from '@domain/entities/commute-streak.entity';

// ========== Response DTOs (interfaces) ==========

export interface StreakResponseDto {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastRecordDate: string | null;
  streakStartDate: string | null;
  weeklyGoal: number;
  weeklyCount: number;
  weekStartDate: string;
  milestonesAchieved: MilestoneType[];
  latestMilestone: MilestoneType | null;
  nextMilestone: NextMilestoneInfo | null;
  streakStatus: StreakStatus;
  excludeWeekends: boolean;
  reminderEnabled: boolean;
  todayRecorded: boolean;
}

export interface StreakUpdateResultDto {
  currentStreak: number;
  isNewRecord: boolean;
  milestoneAchieved: MilestoneType | null;
  todayFirstCompletion: boolean;
  weeklyCount: number;
  weeklyGoal: number;
}

export interface MilestoneInfoDto {
  type: MilestoneType;
  label: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  daysRemaining?: number;
  badge: string;
  badgeName: string;
}

export interface MilestonesResponseDto {
  milestones: MilestoneInfoDto[];
  currentStreak: number;
  earnedBadges: StreakBadgeDto[];
}

export interface StreakBadgeDto {
  type: MilestoneType;
  badge: string;
  badgeName: string;
  label: string;
}

// ========== Input DTOs (classes with validation) ==========

export class UpdateStreakSettingsDto {
  @IsOptional()
  @IsInt({ message: '주간 목표는 정수여야 합니다.' })
  @Min(1, { message: '주간 목표는 최소 1이어야 합니다.' })
  @Max(7, { message: '주간 목표는 최대 7이어야 합니다.' })
  weeklyGoal?: number;

  @IsOptional()
  @IsBoolean({ message: '주말 제외 여부는 불리언이어야 합니다.' })
  excludeWeekends?: boolean;

  @IsOptional()
  @IsBoolean({ message: '리마인더 활성화 여부는 불리언이어야 합니다.' })
  reminderEnabled?: boolean;
}
