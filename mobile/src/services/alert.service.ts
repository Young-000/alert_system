import { apiClient } from './api-client';

import type { Alert, CreateAlertPayload, UpdateAlertPayload } from '@/types/alert';

export const alertService = {
  async fetchAlerts(userId: string): Promise<Alert[]> {
    return apiClient.get<Alert[]>(`/alerts/user/${userId}`);
  },

  async createAlert(payload: CreateAlertPayload): Promise<Alert> {
    return apiClient.post<Alert, CreateAlertPayload>('/alerts', payload);
  },

  async updateAlert(id: string, payload: UpdateAlertPayload): Promise<Alert> {
    return apiClient.patch<Alert, UpdateAlertPayload>(`/alerts/${id}`, payload);
  },

  async deleteAlert(id: string): Promise<void> {
    await apiClient.delete(`/alerts/${id}`);
  },

  async toggleAlert(id: string): Promise<Alert> {
    return apiClient.patch<Alert>(`/alerts/${id}/toggle`, {});
  },
};
