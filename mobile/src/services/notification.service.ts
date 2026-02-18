import { apiClient } from './api-client';

import type { NotificationHistoryResponse, NotificationStatsDto } from '@/types/notification';

export const notificationService = {
  async fetchHistory(limit = 20, offset = 0): Promise<NotificationHistoryResponse> {
    return apiClient.get<NotificationHistoryResponse>(
      `/notifications/history?limit=${limit}&offset=${offset}`,
    );
  },

  async fetchStats(days = 0): Promise<NotificationStatsDto> {
    return apiClient.get<NotificationStatsDto>(
      `/notifications/stats${days ? `?days=${days}` : ''}`,
    );
  },
};
