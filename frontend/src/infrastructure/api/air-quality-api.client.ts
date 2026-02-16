import type { ApiClient } from './api-client';

export interface AirQualityData {
  location: string;
  pm10: number;
  pm25: number;
  aqi: number;
  status: string;
}

export class AirQualityApiClient {
  constructor(private apiClient: ApiClient) {}

  async getByLocation(lat: number, lng: number): Promise<AirQualityData> {
    return this.apiClient.get<AirQualityData>(
      `/air-quality/location?lat=${lat}&lng=${lng}`
    );
  }
}
