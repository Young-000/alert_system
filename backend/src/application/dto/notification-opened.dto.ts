import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class NotificationOpenedDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  alertId: string;

  @IsString()
  @IsOptional()
  notificationId?: string;
}
