import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  IsArray,
  IsEnum,
  IsUUID,
  Validate,
} from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';
import { CronExpressionValidator } from './create-alert.dto';

export class UpdateAlertDto {
  @IsOptional()
  @IsString({ message: '알림 이름은 문자열이어야 합니다.' })
  // alerts.name 은 varchar(255)다. 여기서 안 막으면 DB가 500으로 끊는다.
  @MaxLength(255, { message: '알림 이름은 255자 이하여야 합니다.' })
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
  // alerts.subway_station_id 는 uuid 컬럼이다 (schema.sql:37).
  @IsUUID(undefined, { message: '유효한 지하철역 ID가 아닙니다.' })
  subwayStationId?: string;
}
