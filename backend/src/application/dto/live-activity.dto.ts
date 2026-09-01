import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MAX_ACTIVITY_ID_LENGTH } from './column-limits';

// ----- Request DTOs -----

export class RegisterLiveActivityDto {
  @IsString()
  @IsNotEmpty()
  pushToken: string;

  @IsString()
  @IsNotEmpty()
  // live_activity_tokens.activity_id 는 VARCHAR(255) 다 (push_token 은 TEXT라 무제한).
  @MaxLength(MAX_ACTIVITY_ID_LENGTH, { message: 'Activity ID는 255자 이하여야 합니다.' })
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
