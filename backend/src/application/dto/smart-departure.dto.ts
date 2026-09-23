import {
  IsString,
  IsUUID,
  IsIn,
  Matches,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

// 상한은 원소 도메인이 정한다 — 0~6(요일 7개)·0~30(사전 알림 31개)을 넘는 길이는
// 전부 중복이다. 읽는 쪽이 includes()만 쓰므로 중복은 동작을 바꾸지 않고 컬럼만 부풀린다.
const MAX_ACTIVE_DAYS = 7;
const MAX_PRE_ALERTS = 31;

// ----- Request DTOs -----

export class CreateSmartDepartureSettingDto {
  @IsUUID()
  routeId: string;

  @IsString()
  @IsIn(['commute', 'return'])
  departureType: 'commute' | 'return';

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'arrivalTarget must be in HH:mm format (00:00-23:59)',
  })
  arrivalTarget: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ACTIVE_DAYS, {
    message: `요일은 최대 ${MAX_ACTIVE_DAYS}개까지 지정할 수 있습니다.`,
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeDays?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PRE_ALERTS, {
    message: `사전 알림은 최대 ${MAX_PRE_ALERTS}개까지 지정할 수 있습니다.`,
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(30, { each: true })
  preAlerts?: number[];
}

export class UpdateSmartDepartureSettingDto {
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'arrivalTarget must be in HH:mm format (00:00-23:59)',
  })
  arrivalTarget?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ACTIVE_DAYS, {
    message: `요일은 최대 ${MAX_ACTIVE_DAYS}개까지 지정할 수 있습니다.`,
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeDays?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PRE_ALERTS, {
    message: `사전 알림은 최대 ${MAX_PRE_ALERTS}개까지 지정할 수 있습니다.`,
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(30, { each: true })
  preAlerts?: number[];
}

// ----- Response DTOs -----

export class SmartDepartureSettingResponseDto {
  id: string;
  userId: string;
  routeId: string;
  departureType: 'commute' | 'return';
  arrivalTarget: string;
  prepTimeMinutes: number;
  isEnabled: boolean;
  activeDays: number[];
  preAlerts: number[];
  createdAt: string;
  updatedAt: string;
}

export class SmartDepartureSnapshotResponseDto {
  id: string;
  settingId: string;
  departureType: 'commute' | 'return';
  departureDate: string;
  arrivalTarget: string;
  estimatedTravelMin: number;
  prepTimeMinutes: number;
  optimalDepartureAt: string;
  minutesUntilDeparture: number;
  status: string;
  baselineTravelMin: number | null;
  historyAvgTravelMin: number | null;
  realtimeAdjustmentMin: number;
  alertsSent: number[];
  nextAlertMin?: number;
  calculatedAt: string;
  updatedAt: string;
}

export class SmartDepartureTodayResponseDto {
  commute?: SmartDepartureSnapshotResponseDto;
  return?: SmartDepartureSnapshotResponseDto;
}

export class CalculateResponseDto {
  recalculated: SmartDepartureSnapshotResponseDto[];
  message: string;
}

export class WidgetDepartureDto {
  departureType: 'commute' | 'return';
  optimalDepartureAt: string;
  minutesUntilDeparture: number;
  estimatedTravelMin: number;
  arrivalTarget: string;
  status: string;
  hasTrafficDelay: boolean;
}
