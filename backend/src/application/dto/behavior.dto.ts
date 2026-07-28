import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsString()
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

  @IsString()
  @IsNotEmpty()
  alertId: string;

  @IsIn(['push', 'app'])
  @IsNotEmpty()
  source: 'push' | 'app';

  @IsString()
  @IsOptional()
  weatherCondition?: string;

  @IsOptional()
  transitDelayMinutes?: number;
}
