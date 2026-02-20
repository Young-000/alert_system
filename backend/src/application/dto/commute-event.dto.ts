import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CommuteEventAction } from '@domain/entities/commute-event.entity';

export class RecordCommuteEventDto {
  @IsUUID('4', { message: '유효한 장소 ID가 필요합니다.' })
  @IsNotEmpty({ message: '장소 ID는 필수입니다.' })
  placeId: string;

  @IsIn(['enter', 'exit'], { message: '이벤트 유형은 enter 또는 exit만 가능합니다.' })
  @IsNotEmpty({ message: '이벤트 유형은 필수입니다.' })
  eventType: 'enter' | 'exit';

  @IsDateString({}, { message: '감지 시각은 ISO 8601 형식이어야 합니다.' })
  @IsNotEmpty({ message: '감지 시각은 필수입니다.' })
  triggeredAt: string;

  @IsOptional()
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: '정확도는 숫자여야 합니다.' })
  @Min(0, { message: '정확도는 0 이상이어야 합니다.' })
  accuracyM?: number;
}

export class BatchCommuteEventsDto {
  @IsArray({ message: '이벤트 목록은 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '최소 1개의 이벤트가 필요합니다.' })
  @ArrayMaxSize(50, { message: '최대 50개의 이벤트까지 처리 가능합니다.' })
  @ValidateNested({ each: true })
  @Type(() => RecordCommuteEventDto)
  events: RecordCommuteEventDto[];
}

// Response DTOs (interfaces for type safety)
export interface CommuteEventResponseDto {
  id: string;
  userId: string;
  placeId: string;
  placeType: string;
  eventType: string;
  triggeredAt: string;
  sessionId?: string;
  action: CommuteEventAction;
}

export interface BatchCommuteEventsResponseDto {
  processed: number;
  ignored: number;
  results: CommuteEventResponseDto[];
}

export interface CommuteEventListResponseDto {
  userId: string;
  events: CommuteEventDetailDto[];
  totalCount: number;
}

export interface CommuteEventDetailDto {
  id: string;
  placeId: string;
  placeType: string;
  placeLabel: string;
  eventType: string;
  triggeredAt: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  sessionId?: string;
  source: string;
  isProcessed: boolean;
}
