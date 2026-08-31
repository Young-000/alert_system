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

/**
 * `alerts.schedule`·`alerts.bus_stop_id`는 둘 다 `VARCHAR(100)`이다
 * (`schema.sql:33,36`). 엔티티가 길이를 생략해 TypeORM 기본값 255로 잡히는 바람에
 * 테스트(`synchronize: true`)는 255짜리 컬럼을 만들어 이 상한을 볼 수 없었다.
 * 여기서 막지 않으면 Postgres가 `value too long for type character varying(100)`으로
 * 끊어 400이 아니라 500이 된다.
 */
export const MAX_SCHEDULE_LENGTH = 100;
export const MAX_BUS_STOP_ID_LENGTH = 100;

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
  // alerts.schedule 은 varchar(100)다 (schema.sql:33). cron 문법상 100자를 넘는
  // *유효한* 식이 존재하므로(분 0~59 나열 = 177자) cron 검증만으로는 못 막는다.
  @MaxLength(MAX_SCHEDULE_LENGTH, { message: '스케줄은 100자 이하여야 합니다.' })
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
  // alerts.bus_stop_id 는 varchar(100)다 (schema.sql:36).
  @MaxLength(MAX_BUS_STOP_ID_LENGTH, {
    message: '버스 정류장 ID는 100자 이하여야 합니다.',
  })
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
