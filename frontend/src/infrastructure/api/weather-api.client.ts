import { ApiClient } from './api-client';
import { Weather } from '../../domain/entities/weather.entity';

export interface Weather {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export class WeatherApiClient {
  constructor(private apiClient: ApiClient) {}

  async getWeatherByUser(userId: string): Promise<Weather> {
    return this.apiClient.get<Weather>(`/weather/user/${userId}`);
  }

  async getWeatherByLocation(lat: number, lng: number): Promise<Weather> {
    return this.apiClient.get<Weather>(`/weather/location?lat=${lat}&lng=${lng}`);
  }
}
