import type { ApiClient } from './api-client';

export interface NotificationLog {
  id: string;
  alertId: string;
  alertName: string;
  alertTypes: string[];
  status: string;
  summary: string;
  sentAt: string;
}

export interface NotificationHistoryResponse {
  items: NotificationLog[];
  total: number;
}

export class NotificationApiClient {
  constructor(private apiClient: ApiClient) {}

  async getHistory(limit = 20, offset = 0): Promise<NotificationHistoryResponse> {
    return this.apiClient.get<NotificationHistoryResponse>(
      `/notifications/history?limit=${limit}&offset=${offset}`,
    );
  }
}
