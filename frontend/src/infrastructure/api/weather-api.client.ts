import { ApiClient } from './api-client';

export interface HourlyForecast {
  time: string;
  timeSlot: string;
  temperature: number;
  condition: string;
  conditionKr: string;
  icon: string;
  rainProbability: number;
}

export interface DailyForecast {
  maxTemp: number;
  minTemp: number;
  hourlyForecasts: HourlyForecast[];
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike?: number;
  conditionKr: string;
  conditionEmoji: string;
  forecast?: DailyForecast;
}

export class WeatherApiClient {
  constructor(private apiClient: ApiClient) {}

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    return this.apiClient.get<WeatherData>(
      `/weather/current?lat=${lat}&lng=${lng}`
    );
  }
}
