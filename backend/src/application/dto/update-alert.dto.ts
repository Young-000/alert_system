import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsUUID,
  Validate,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { AlertType } from '@domain/entities/alert.entity';
import { NON_BLANK, NON_BLANK_MESSAGE } from './column-limits';
import {
  CronExpressionValidator,
  MAX_SCHEDULE_LENGTH,
  MAX_BUS_STOP_ID_LENGTH,
} from './create-alert.dto';

export class UpdateAlertDto {
  @IsOptional()
  @IsString({ message: '알림 이름은 문자열이어야 합니다.' })
  // 생성과 같은 하한 — 한쪽만 막으면 수정으로 우회된다. 빈 이름이 저장되면
  // 목록 행의 이름 칸이 비어 어느 알림인지 구분할 수 없다.
  @IsNotEmpty({ message: '알림 이름은 필수입니다.' })
  @Matches(NON_BLANK, { message: `알림 이름은 ${NON_BLANK_MESSAGE}` })
  // alerts.name 은 varchar(255)다. 여기서 안 막으면 DB가 500으로 끊는다.
  @MaxLength(255, { message: '알림 이름은 255자 이하여야 합니다.' })
  name?: string;

  @IsOptional()
  @IsString()
  // 생성 경로와 같은 상한 — 한쪽만 막으면 수정으로 우회된다.
  @MaxLength(MAX_SCHEDULE_LENGTH, { message: '스케줄은 100자 이하여야 합니다.' })
  @Validate(CronExpressionValidator)
  schedule?: string;

  @IsOptional()
  @IsArray({ message: '알림 유형은 배열이어야 합니다.' })
  // 생성과 같은 하한 — 한쪽만 막으면 수정으로 우회된다.
  // 빈 배열이 저장되면 `SendNotificationUseCase`의 타입별 수집 분기가 전부
  // 건너뛰어지는데(:135·143·155·176) schedule·enabled는 그대로라 크론은 정시에
  // 발화한다. 결과: 내용이 하나도 없는 알림톡이 건당 과금되며 나간다.
  @ArrayMinSize(1, { message: '최소 하나의 알림 타입이 필요합니다.' })
  @IsEnum(AlertType, { each: true, message: '올바른 알림 유형이 아닙니다.' })
  alertTypes?: AlertType[];

  @IsOptional()
  @IsBoolean({ message: '활성화 상태는 boolean이어야 합니다.' })
  enabled?: boolean;

  @IsOptional()
  @IsString({ message: '버스 정류장 ID는 문자열이어야 합니다.' })
  @MaxLength(MAX_BUS_STOP_ID_LENGTH, {
    message: '버스 정류장 ID는 100자 이하여야 합니다.',
  })
  busStopId?: string;

  @IsOptional()
  // alerts.subway_station_id 는 uuid 컬럼이다 (schema.sql:37).
  @IsUUID(undefined, { message: '유효한 지하철역 ID가 아닙니다.' })
  subwayStationId?: string;
}
