import { ApiClient } from './api-client';
import { AirQuality } from '../../domain/entities/air-quality.entity';

export class AirQualityApiClient {
  constructor(private apiClient: ApiClient) {}

  async getAirQualityByUser(userId: string): Promise<AirQuality> {
    return this.apiClient.get<AirQuality>(`/air-quality/user/${userId}`);
  }

  async getAirQualityByLocation(lat: number, lng: number): Promise<AirQuality> {
    return this.apiClient.get<AirQuality>(`/air-quality/location?lat=${lat}&lng=${lng}`);
  }
}
