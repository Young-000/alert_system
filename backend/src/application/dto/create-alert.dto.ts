import {
  IsNotEmpty,
  IsString,
  IsArray,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  ArrayMinSize,
  IsIn,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';
import { CronExpressionParser } from 'cron-parser';

const ALERT_TYPES: AlertType[] = [
  AlertType.WEATHER,
  AlertType.AIR_QUALITY,
  AlertType.BUS,
  AlertType.SUBWAY,
];

@ValidatorConstraint({ name: 'cronExpression', async: false })
export class CronExpressionValidator implements ValidatorConstraintInterface {
  validate(expression: string): boolean {
    if (!expression) return false;
    try {
      CronExpressionParser.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return '유효한 Cron 표현식을 입력해주세요.';
  }
}

export class CreateAlertDto {
  @IsUUID('4', { message: '유효한 사용자 ID가 필요합니다.' })
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: '알림 이름은 필수입니다.' })
  // alerts.name 은 varchar(255)다. 여기서 안 막으면 DB가 500으로 끊는다.
  @MaxLength(255, { message: '알림 이름은 255자 이하여야 합니다.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '스케줄은 필수입니다.' })
  @Validate(CronExpressionValidator)
  schedule: string;

  @IsArray()
  @ArrayMinSize(1, { message: '최소 하나의 알림 타입이 필요합니다.' })
  @IsIn(ALERT_TYPES, { each: true, message: '유효한 알림 타입이 아닙니다.' })
  alertTypes: AlertType[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  busStopId?: string;

  @IsOptional()
  // alerts.subway_station_id 는 uuid 컬럼이다 (schema.sql:37).
  // @IsString()만 걸면 '강남역' 같은 값이 INSERT까지 내려가 Postgres가 500으로 끊는다.
  // 버전 미고정 — 컬럼이 요구하는 것은 "uuid"이지 "v4"가 아니다.
  @IsUUID(undefined, { message: '유효한 지하철역 ID가 아닙니다.' })
  subwayStationId?: string;

  @IsOptional()
  @IsUUID('4', { message: '유효한 경로 ID가 필요합니다.' })
  routeId?: string;
}
