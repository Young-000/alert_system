import type { ApiClient } from './api-client';

// ─── Types ─────────────────────────────────────────

export type AdviceSeverity = 'info' | 'warning' | 'danger';

export interface AdviceChip {
  emoji: string;
  text: string;
  severity: AdviceSeverity;
}

export interface BriefingWeatherData {
  temperature: number;
  feelsLike?: number;
  condition: string;
  conditionKr: string;
  humidity: number;
  windSpeed: number;
  maxTemp?: number;
  minTemp?: number;
  rainProbability?: number;
}

export interface BriefingAirQualityData {
  pm10: number;
  pm25: number;
  status: string;
}

export interface BriefingResponse {
  advices: AdviceChip[];
  weather: BriefingWeatherData | null;
  airQuality: BriefingAirQualityData | null;
  contextLabel: string;
  summary: string;
  updatedAt: string;
}

// ─── API Client ────────────────────────────────────

export class BriefingApiClient {
  constructor(private apiClient: ApiClient) {}

  async getBriefing(lat?: number, lng?: number): Promise<BriefingResponse> {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', String(lat));
    if (lng !== undefined) params.set('lng', String(lng));
    const qs = params.toString();
    const url = `/briefing${qs ? `?${qs}` : ''}`;
    return this.apiClient.get<BriefingResponse>(url);
  }
}
