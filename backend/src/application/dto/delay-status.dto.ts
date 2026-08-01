import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

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
  fromStationName!: string;

  @IsString()
  @IsNotEmpty()
  fromLine!: string;

  @IsString()
  @IsNotEmpty()
  toStationName!: string;

  @IsString()
  @IsNotEmpty()
  toLine!: string;

  @IsInt()
  @Min(0)
  walkingMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  walkingDistanceMeters?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isBidirectional?: boolean;
}
