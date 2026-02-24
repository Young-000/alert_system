import type { ApiClient } from './api-client';

// ─── Types ───────────────────────────────────────────

export type DepartureType = 'commute' | 'return';

export interface SmartDepartureSetting {
  id: string;
  userId: string;
  routeId: string;
  departureType: DepartureType;
  arrivalTarget: string;
  prepTimeMinutes: number;
  isEnabled: boolean;
  activeDays: number[];
  preAlerts: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmartDepartureDto {
  routeId: string;
  departureType: DepartureType;
  arrivalTarget: string;
  prepTimeMinutes?: number;
  activeDays?: number[];
  preAlerts?: number[];
}

export interface UpdateSmartDepartureDto {
  routeId?: string;
  arrivalTarget?: string;
  prepTimeMinutes?: number;
  activeDays?: number[];
  preAlerts?: number[];
}

export interface SmartDepartureSnapshot {
  id: string;
  settingId: string;
  departureType: DepartureType;
  departureDate: string;
  arrivalTarget: string;
  estimatedTravelMin: number;
  prepTimeMinutes: number;
  optimalDepartureAt: string;
  minutesUntilDeparture: number;
  status: string;
  baselineTravelMin: number | null;
  historyAvgTravelMin: number | null;
  realtimeAdjustmentMin: number;
  alertsSent: number[];
  nextAlertMin?: number;
  calculatedAt: string;
  updatedAt: string;
}

export interface SmartDepartureTodayResponse {
  commute?: SmartDepartureSnapshot;
  return?: SmartDepartureSnapshot;
}

// ─── API Client ──────────────────────────────────────

export class SmartDepartureApiClient {
  constructor(private apiClient: ApiClient) {}

  async getSettings(): Promise<SmartDepartureSetting[]> {
    return this.apiClient.get<SmartDepartureSetting[]>('/smart-departure/settings');
  }

  async createSetting(dto: CreateSmartDepartureDto): Promise<SmartDepartureSetting> {
    return this.apiClient.post<SmartDepartureSetting>('/smart-departure/settings', dto);
  }

  async updateSetting(id: string, dto: UpdateSmartDepartureDto): Promise<SmartDepartureSetting> {
    return this.apiClient.put<SmartDepartureSetting>(`/smart-departure/settings/${id}`, dto);
  }

  async deleteSetting(id: string): Promise<void> {
    return this.apiClient.delete(`/smart-departure/settings/${id}`);
  }

  async toggleSetting(id: string): Promise<SmartDepartureSetting> {
    return this.apiClient.patch<SmartDepartureSetting>(`/smart-departure/settings/${id}/toggle`);
  }

  async getToday(): Promise<SmartDepartureTodayResponse> {
    return this.apiClient.get<SmartDepartureTodayResponse>('/smart-departure/today');
  }
}
