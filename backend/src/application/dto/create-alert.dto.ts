import {
  IsNotEmpty,
  IsString,
  IsArray,
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
  @IsString()
  subwayStationId?: string;
}
