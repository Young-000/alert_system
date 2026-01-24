import { IsNotEmpty, IsString, IsUrl, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class PushSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUrl()
  @IsNotEmpty()
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUrl()
  @IsNotEmpty()
  endpoint: string;
}
