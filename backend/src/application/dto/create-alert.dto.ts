import { AlertType } from '@domain/entities/alert.entity';

export class CreateAlertDto {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
}

