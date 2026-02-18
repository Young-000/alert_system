import { apiClient } from './api-client';

type PushTokenResponse = {
  success: boolean;
};

export const pushService = {
  async registerToken(token: string): Promise<PushTokenResponse> {
    return apiClient.post<PushTokenResponse, { token: string }>('/push/expo-token', { token });
  },

  async removeToken(token: string): Promise<PushTokenResponse> {
    return apiClient.delete<PushTokenResponse, { token: string }>('/push/expo-token', { token });
  },
};
