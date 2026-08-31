import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsObject,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { INT4_MAX, INT4_MIN } from './column-limits';

// behavior_events.alert_id / commute_records.alert_id 는 uuid 컬럼이다
// (20260120_add_behavior_tracking.sql:11, :39). @IsString()만 걸면 비-uuid 문자열이
// save 까지 내려가 Postgres 가 invalid input syntax for type uuid 로 끊는다 — 500.
// 버전 미고정 — 컬럼이 요구하는 것은 "uuid"이지 "v4"가 아니다.

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsUUID(undefined, { message: '유효한 알림 ID가 아닙니다.' })
  @IsOptional()
  alertId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsIn(['push', 'app'])
  @IsOptional()
  source?: 'push' | 'app';
}

export class DepartureConfirmedDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsUUID(undefined, { message: '유효한 알림 ID가 아닙니다.' })
  @IsNotEmpty()
  alertId: string;

  @IsIn(['push', 'app'])
  @IsNotEmpty()
  source: 'push' | 'app';

  @IsString()
  @IsOptional()
  weatherCondition?: string;

  @IsOptional()
  // commute_records.transit_delay_minutes 는 INTEGER 다
  // (20260120_add_behavior_tracking.sql:45). 검증자가 @IsOptional() 뿐이라
  // 'abc' 같은 값도 save 까지 내려갔다 — invalid input syntax for type integer, 500.
  // 하한은 int4 하한 그대로 둔다: 음수 지연(예정보다 빠른 도착)은 도메인상 유효하다.
  @IsInt({ message: '지연 시간은 정수여야 합니다.' })
  @Min(INT4_MIN, { message: '지연 시간이 저장 가능한 범위를 벗어났습니다.' })
  @Max(INT4_MAX, { message: '지연 시간이 저장 가능한 범위를 벗어났습니다.' })
  transitDelayMinutes?: number;
}
