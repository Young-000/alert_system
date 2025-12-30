import { ApiClient } from './api-client';

export type AlertType = 'weather' | 'airQuality' | 'bus' | 'subway';

export interface Alert {
  id: string;
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
}

export interface CreateAlertDto {
  userId: string;
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  busStopId?: string;
  subwayStationId?: string;
}

export class AlertApiClient {
  constructor(private apiClient: ApiClient) {}

  async createAlert(dto: CreateAlertDto): Promise<Alert> {
    return this.apiClient.post<Alert>('/alerts', dto);
  }

  async getAlertsByUser(userId: string): Promise<Alert[]> {
    return this.apiClient.get<Alert[]>(`/alerts/user/${userId}`);
  }

  async getAlert(id: string): Promise<Alert> {
    return this.apiClient.get<Alert>(`/alerts/${id}`);
  }

  async deleteAlert(id: string): Promise<void> {
    return this.apiClient.delete(`/alerts/${id}`);
  }
}

