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
} from 'class-validator';

// ----- Request DTOs -----

export class CreateSmartDepartureSettingDto {
  @IsUUID()
  routeId: string;

  @IsString()
  @IsIn(['commute', 'return'])
  departureType: 'commute' | 'return';

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'arrivalTarget must be in HH:mm format' })
  arrivalTarget: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeDays?: number[];

  @IsOptional()
  @IsArray()
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
  @Matches(/^\d{2}:\d{2}$/, { message: 'arrivalTarget must be in HH:mm format' })
  arrivalTarget?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeDays?: number[];

  @IsOptional()
  @IsArray()
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
