import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

// ----- Request DTOs -----

export class RegisterLiveActivityDto {
  @IsString()
  @IsNotEmpty()
  pushToken: string;

  @IsString()
  @IsNotEmpty()
  activityId: string;

  @IsString()
  @IsIn(['commute', 'return'])
  mode: 'commute' | 'return';

  @IsOptional()
  @IsUUID()
  settingId?: string;
}

// ----- Response DTOs -----

export class RegisterLiveActivityResponseDto {
  id: string;
  registered: boolean;
}

export class LiveActivityTokenResponseDto {
  id: string;
  activityId: string;
  mode: 'commute' | 'return';
  settingId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
