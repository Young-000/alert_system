import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsUUID,
  ArrayMinSize,
  IsIn,
  Matches,
} from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';

const ALERT_TYPES: AlertType[] = [
  AlertType.WEATHER,
  AlertType.AIR_QUALITY,
  AlertType.BUS,
  AlertType.SUBWAY,
];

export class CreateAlertDto {
  @IsUUID('4', { message: '유효한 사용자 ID가 필요합니다.' })
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: '알림 이름은 필수입니다.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '스케줄은 필수입니다.' })
  @Matches(
    /^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|[0-6]|\*\/[0-6])$/,
    { message: '유효한 Cron 표현식을 입력해주세요.' },
  )
  schedule: string;

  @IsArray()
  @ArrayMinSize(1, { message: '최소 하나의 알림 타입이 필요합니다.' })
  @IsIn(ALERT_TYPES, { each: true, message: '유효한 알림 타입이 아닙니다.' })
  alertTypes: AlertType[];

  @IsOptional()
  @IsString()
  busStopId?: string;

  @IsOptional()
  @IsString()
  subwayStationId?: string;
}
