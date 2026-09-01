import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { INT4_MAX, MAX_STATION_NAME_LENGTH, MAX_LINE_NAME_LENGTH } from './column-limits';

export type OverallDelayStatus =
  | 'normal'
  | 'minor_delay'
  | 'delayed'
  | 'severe_delay'
  | 'unavailable';

export type SegmentDelayStatus =
  | 'normal'
  | 'delayed'
  | 'severe_delay'
  | 'unavailable';

export type AlternativeConfidence = 'high' | 'medium' | 'low';

export interface DelaySegmentDto {
  checkpointId: string;
  checkpointName: string;
  checkpointType: string;
  lineInfo: string;
  status: SegmentDelayStatus;
  expectedWaitMinutes: number;
  estimatedWaitMinutes: number;
  delayMinutes: number;
  source: 'realtime_api' | 'estimated';
  lastUpdated: string;
}

export interface AlternativeStepDto {
  action: 'walk' | 'subway' | 'bus';
  from: string;
  to?: string;
  line?: string;
  durationMinutes: number;
}

export interface AlternativeSuggestionDto {
  id: string;
  triggerSegment: string;
  triggerReason: string;
  description: string;
  steps: AlternativeStepDto[];
  totalDurationMinutes: number;
  originalDurationMinutes: number;
  savingsMinutes: number;
  walkingDistanceMeters?: number;
  confidence: AlternativeConfidence;
}

export interface DelayStatusResponseDto {
  routeId: string;
  routeName: string;
  checkedAt: string;
  overallStatus: OverallDelayStatus;
  totalExpectedDuration: number;
  totalEstimatedDuration: number;
  totalDelayMinutes: number;
  segments: DelaySegmentDto[];
  alternatives: AlternativeSuggestionDto[];
}

export interface AlternativeMappingResponseDto {
  id: string;
  fromStationName: string;
  fromLine: string;
  toStationName: string;
  toLine: string;
  walkingMinutes: number;
  walkingDistanceMeters?: number;
  description?: string;
  isBidirectional: boolean;
  isActive: boolean;
}

export class CreateAlternativeMappingDto {
  @IsString()
  @IsNotEmpty()
  // alternative_mappings.from_station_name 은 VARCHAR(100) 이다
  // (20260205_add_route_analytics.sql). 상한이 없으면 초과분이 INSERT까지 내려가 500이 된다.
  @MaxLength(MAX_STATION_NAME_LENGTH, { message: '역 이름은 100자 이하여야 합니다.' })
  fromStationName!: string;

  @IsString()
  @IsNotEmpty()
  // alternative_mappings.from_line 은 VARCHAR(50) 이다 — 역 이름(100)보다 좁다.
  @MaxLength(MAX_LINE_NAME_LENGTH, { message: '노선 이름은 50자 이하여야 합니다.' })
  fromLine!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_STATION_NAME_LENGTH, { message: '역 이름은 100자 이하여야 합니다.' })
  toStationName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_LINE_NAME_LENGTH, { message: '노선 이름은 50자 이하여야 합니다.' })
  toLine!: string;

  @IsInt()
  @Min(0)
  // alternative_mappings.walking_minutes 도 INTEGER 다 (아래 walking_distance_meters 와 같다).
  @Max(INT4_MAX, { message: '도보 시간이 저장 가능한 범위를 벗어났습니다.' })
  walkingMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  // alternative_mappings.walking_distance_meters 는 INTEGER
  @Max(INT4_MAX, { message: '도보 거리가 저장 가능한 범위를 벗어났습니다.' })
  walkingDistanceMeters?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isBidirectional?: boolean;
}
