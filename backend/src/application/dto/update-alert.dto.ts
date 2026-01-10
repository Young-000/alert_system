import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsEnum,
  Validate,
} from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';
import { CronExpressionValidator } from './create-alert.dto';

export class UpdateAlertDto {
  @IsOptional()
  @IsString({ message: '알림 이름은 문자열이어야 합니다.' })
  name?: string;

  @IsOptional()
  @IsString()
  @Validate(CronExpressionValidator)
  schedule?: string;

  @IsOptional()
  @IsArray({ message: '알림 유형은 배열이어야 합니다.' })
  @IsEnum(AlertType, { each: true, message: '올바른 알림 유형이 아닙니다.' })
  alertTypes?: AlertType[];

  @IsOptional()
  @IsBoolean({ message: '활성화 상태는 boolean이어야 합니다.' })
  enabled?: boolean;

  @IsOptional()
  @IsString({ message: '버스 정류장 ID는 문자열이어야 합니다.' })
  busStopId?: string;

  @IsOptional()
  @IsString({ message: '지하철역 ID는 문자열이어야 합니다.' })
  subwayStationId?: string;
}
