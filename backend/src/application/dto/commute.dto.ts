import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsNotEmpty,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteType, CheckpointType, TransportMode } from '@domain/entities/commute-route.entity';

// ========== Route DTOs ==========

export class CreateCheckpointDto {
  @IsNumber({}, { message: '순서는 숫자여야 합니다.' })
  @Min(0, { message: '순서는 0 이상이어야 합니다.' })
  sequenceOrder: number;

  @IsString({ message: '체크포인트 이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '체크포인트 이름은 필수입니다.' })
  name: string;

  @IsEnum(CheckpointType, { message: '유효한 체크포인트 유형이 아닙니다.' })
  checkpointType: CheckpointType;

  @IsOptional()
  @IsString()
  linkedStationId?: string;

  @IsOptional()
  @IsString()
  linkedBusStopId?: string;

  @IsOptional()
  @IsString()
  lineInfo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedDurationToNext?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedWaitTime?: number;

  @IsOptional()
  @IsEnum(TransportMode)
  transportMode?: TransportMode;
}

export class CreateRouteDto {
  @IsUUID('4', { message: '유효한 사용자 ID가 필요합니다.' })
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  userId: string;

  @IsString({ message: '경로 이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '경로 이름은 필수입니다.' })
  name: string;

  @IsEnum(RouteType, { message: '유효한 경로 유형이 아닙니다.' })
  routeType: RouteType;

  @IsOptional()
  @IsBoolean({ message: '기본 경로 여부는 불린이어야 합니다.' })
  isPreferred?: boolean;

  @IsArray({ message: '체크포인트 목록은 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '최소 하나의 체크포인트가 필요합니다.' })
  @ValidateNested({ each: true })
  @Type(() => CreateCheckpointDto)
  checkpoints: CreateCheckpointDto[];
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RouteType)
  routeType?: RouteType;

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCheckpointDto)
  checkpoints?: CreateCheckpointDto[];
}

// Response DTOs (used for type safety, no validation needed)
export interface RouteResponseDto {
  id: string;
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred: boolean;
  totalExpectedDuration?: number;
  totalTransferTime: number;
  pureMovementTime: number;
  checkpoints: CheckpointResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckpointResponseDto {
  id: string;
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime: number;
  transportMode?: TransportMode;
  totalExpectedTime: number;
  isTransferRelated: boolean;
}

// ========== Session DTOs ==========

export class StartSessionDto {
  @IsUUID('4', { message: '유효한 사용자 ID가 필요합니다.' })
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  userId: string;

  @IsUUID('4', { message: '유효한 경로 ID가 필요합니다.' })
  @IsNotEmpty({ message: '경로 ID는 필수입니다.' })
  routeId: string;

  @IsOptional()
  @IsString({ message: '날씨 조건은 문자열이어야 합니다.' })
  weatherCondition?: string;
}

export class RecordCheckpointDto {
  @IsUUID('4', { message: '유효한 세션 ID가 필요합니다.' })
  @IsNotEmpty({ message: '세션 ID는 필수입니다.' })
  sessionId: string;

  @IsUUID('4', { message: '유효한 체크포인트 ID가 필요합니다.' })
  @IsNotEmpty({ message: '체크포인트 ID는 필수입니다.' })
  checkpointId: string;

  @IsOptional()
  @IsNumber({}, { message: '대기 시간은 숫자여야 합니다.' })
  @Min(0, { message: '대기 시간은 0 이상이어야 합니다.' })
  actualWaitTime?: number;

  @IsOptional()
  @IsString({ message: '메모는 문자열이어야 합니다.' })
  notes?: string;
}

export class CompleteSessionDto {
  @IsUUID('4', { message: '유효한 세션 ID가 필요합니다.' })
  @IsNotEmpty({ message: '세션 ID는 필수입니다.' })
  sessionId: string;

  @IsOptional()
  @IsString({ message: '메모는 문자열이어야 합니다.' })
  notes?: string;
}

// Response DTOs (interfaces for type safety)
export interface SessionResponseDto {
  id: string;
  userId: string;
  routeId: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMinutes?: number;
  totalWaitMinutes: number;
  totalDelayMinutes: number;
  status: string;
  weatherCondition?: string;
  notes?: string;
  progress: number;
  delayStatus: string;
  pureMovementTime: number;
  waitTimePercentage: number;
  checkpointRecords: CheckpointRecordResponseDto[];
}

export interface CheckpointRecordResponseDto {
  id: string;
  checkpointId: string;
  checkpointName?: string;
  arrivedAt: string;
  arrivalTimeString: string;
  durationFromPrevious?: number;
  actualWaitTime: number;
  isDelayed: boolean;
  delayMinutes: number;
  waitDelayMinutes: number;
  delayStatus: string;
  waitDelayStatus: string;
  totalDuration: number;
  notes?: string;
}

// ========== Stats DTOs ==========

export interface CheckpointStatsDto {
  checkpointId: string;
  checkpointName: string;
  checkpointType: CheckpointType;
  expectedDuration: number;
  expectedWaitTime: number;
  averageActualDuration: number;
  averageActualWaitTime: number;
  averageDelay: number;
  sampleCount: number;
  variability: number; // 표준편차
  isBottleneck: boolean; // 가장 지연이 많은 구간인지
}

export interface RouteStatsDto {
  routeId: string;
  routeName: string;
  totalSessions: number;
  averageTotalDuration: number;
  averageTotalWaitTime: number;
  averageDelay: number;
  waitTimePercentage: number;
  checkpointStats: CheckpointStatsDto[];
  bottleneckCheckpoint?: string; // 가장 지연이 많은 구간 이름
  mostVariableCheckpoint?: string; // 가장 변동성 높은 구간 이름
}

export interface DayOfWeekStatsDto {
  dayOfWeek: number; // 0=일요일, 1=월요일, ...
  dayName: string;
  averageDuration: number;
  averageWaitTime: number;
  averageDelay: number;
  sampleCount: number;
}

export interface WeatherImpactDto {
  condition: string;
  averageDuration: number;
  averageDelay: number;
  sampleCount: number;
  comparedToNormal: number; // 맑음 대비 차이 (분)
}

export interface CommuteStatsResponseDto {
  userId: string;
  totalSessions: number;
  recentSessions: number;
  overallAverageDuration: number;
  overallAverageWaitTime: number;
  overallAverageDelay: number;
  waitTimePercentage: number;
  routeStats: RouteStatsDto[];
  dayOfWeekStats: DayOfWeekStatsDto[];
  weatherImpact: WeatherImpactDto[];
  insights: string[]; // "비 오는 날 평균 5분 더 걸려요", "월요일이 가장 오래 걸려요" 등
}

// ========== History DTOs ==========

export interface SessionSummaryDto {
  id: string;
  routeId: string;
  routeName?: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMinutes?: number;
  totalWaitMinutes: number;
  totalDelayMinutes: number;
  status: string;
  weatherCondition?: string;
  delayStatus: string;
}

export interface CommuteHistoryResponseDto {
  userId: string;
  sessions: SessionSummaryDto[];
  totalCount: number;
  hasMore: boolean;
}
