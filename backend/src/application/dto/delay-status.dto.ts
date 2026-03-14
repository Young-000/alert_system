import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
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
  @IsNotEmpty({ message: '출발역 이름은 필수입니다.' })
  fromStationName: string;

  @IsString()
  @IsNotEmpty({ message: '출발 노선은 필수입니다.' })
  fromLine: string;

  @IsString()
  @IsNotEmpty({ message: '도착역 이름은 필수입니다.' })
  toStationName: string;

  @IsString()
  @IsNotEmpty({ message: '도착 노선은 필수입니다.' })
  toLine: string;

  @IsNumber({}, { message: '도보 소요 시간은 숫자여야 합니다.' })
  @Min(0, { message: '도보 소요 시간은 0 이상이어야 합니다.' })
  walkingMinutes: number;

  @IsOptional()
  @IsNumber({}, { message: '도보 거리는 숫자여야 합니다.' })
  @Min(0, { message: '도보 거리는 0 이상이어야 합니다.' })
  walkingDistanceMeters?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean({ message: '양방향 여부는 불린이어야 합니다.' })
  isBidirectional?: boolean;
}
