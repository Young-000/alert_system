import { IsUUID, IsArray, IsString, ArrayMinSize } from 'class-validator';

export class SchedulerTriggerDto {
  @IsUUID()
  alertId: string;

  @IsUUID()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  alertTypes: string[];
}
