import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const EVENT_SOURCES = ['push', 'app'] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export class TrackEventDto {
  @IsString()
  @IsNotEmpty({ message: 'userId는 필수입니다.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'eventType은 필수입니다.' })
  eventType: string;

  @IsOptional()
  @IsString()
  alertId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsIn(EVENT_SOURCES, { message: 'source는 push 또는 app이어야 합니다.' })
  source?: EventSource;
}

export class DepartureConfirmedDto {
  @IsString()
  @IsNotEmpty({ message: 'userId는 필수입니다.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'alertId는 필수입니다.' })
  alertId: string;

  @IsIn(EVENT_SOURCES, { message: 'source는 push 또는 app이어야 합니다.' })
  source: EventSource;

  @IsOptional()
  @IsString()
  weatherCondition?: string;

  @IsOptional()
  @IsNumber({}, { message: 'transitDelayMinutes는 숫자여야 합니다.' })
  transitDelayMinutes?: number;
}

export class NotificationOpenedDto {
  @IsString()
  @IsNotEmpty({ message: 'userId는 필수입니다.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'alertId는 필수입니다.' })
  alertId: string;

  @IsOptional()
  @IsString()
  notificationId?: string;
}
