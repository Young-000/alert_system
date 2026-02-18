import { apiClient } from './api-client';

import type {
  CalculateResponse,
  CreateSmartDepartureSettingDto,
  SmartDepartureSettingDto,
  SmartDepartureTodayResponse,
  UpdateSmartDepartureSettingDto,
} from '@/types/smart-departure';

export const smartDepartureService = {
  /** Fetch all smart departure settings (commute + return). */
  async fetchSettings(): Promise<SmartDepartureSettingDto[]> {
    return apiClient.get<SmartDepartureSettingDto[]>(
      '/smart-departure/settings',
    );
  },

  /** Create a new smart departure setting. */
  async createSetting(
    dto: CreateSmartDepartureSettingDto,
  ): Promise<SmartDepartureSettingDto> {
    return apiClient.post<
      SmartDepartureSettingDto,
      CreateSmartDepartureSettingDto
    >('/smart-departure/settings', dto);
  },

  /** Update an existing smart departure setting. */
  async updateSetting(
    id: string,
    dto: UpdateSmartDepartureSettingDto,
  ): Promise<SmartDepartureSettingDto> {
    return apiClient.put<
      SmartDepartureSettingDto,
      UpdateSmartDepartureSettingDto
    >(`/smart-departure/settings/${id}`, dto);
  },

  /** Delete a smart departure setting. */
  async deleteSetting(id: string): Promise<void> {
    await apiClient.delete(`/smart-departure/settings/${id}`);
  },

  /** Toggle a smart departure setting on/off. */
  async toggleSetting(id: string): Promise<SmartDepartureSettingDto> {
    return apiClient.patch<SmartDepartureSettingDto>(
      `/smart-departure/settings/${id}/toggle`,
      {},
    );
  },

  /** Fetch today's departure info (commute + return snapshots). */
  async fetchToday(): Promise<SmartDepartureTodayResponse> {
    return apiClient.get<SmartDepartureTodayResponse>(
      '/smart-departure/today',
    );
  },

  /** Trigger manual recalculation for all active settings. */
  async calculate(): Promise<CalculateResponse> {
    return apiClient.post<CalculateResponse>('/smart-departure/calculate');
  },
};
