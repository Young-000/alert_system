import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional, Matches } from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  // Cron 패턴 검증 (분 시 일 월 요일)
  @Matches(/^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'schedule must be a valid cron pattern (minute hour day month weekday)',
  })
  schedule: string;

  @IsArray()
  @IsEnum(AlertType, { each: true })
  @IsNotEmpty()
  alertTypes: AlertType[];

  @IsOptional()
  @IsString()
  busStopId?: string;

  @IsOptional()
  @IsString()
  subwayStationId?: string;
}

