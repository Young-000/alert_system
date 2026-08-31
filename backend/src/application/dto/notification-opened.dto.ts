import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class NotificationOpenedDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  // behavior_events.alert_id 는 uuid 컬럼이다 (20260120_add_behavior_tracking.sql:11).
  @IsUUID(undefined, { message: '유효한 알림 ID가 아닙니다.' })
  @IsNotEmpty()
  alertId: string;

  @IsString()
  @IsOptional()
  notificationId?: string;
}
