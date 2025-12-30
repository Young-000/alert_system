import axios, { AxiosInstance } from 'axios';
import { Logger } from '@nestjs/common';
import { Weather } from '@domain/entities/weather.entity';

export interface IWeatherApiClient {
  getWeather(lat: number, lng: number): Promise<Weather>;
}

export class WeatherApiClient implements IWeatherApiClient {
  private client: AxiosInstance;
  private readonly logger = new Logger(WeatherApiClient.name);

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      params: {
        appid: this.apiKey,
        units: 'metric',
      },
    });
  }

  async getWeather(lat: number, lng: number): Promise<Weather> {
    try {
      const response = await this.client.get('/weather', {
        params: { lat, lon: lng },
      });

      return new Weather(
        response.data.name,
        response.data.main.temp,
        response.data.weather[0].main,
        response.data.main.humidity,
        response.data.wind.speed
      );
    } catch (error) {
      this.logger.error(`Failed to fetch weather for lat: ${lat}, lng: ${lng}`, error);
      // 에러 상세 정보는 로그에만 남기고, 클라이언트에는 일반적인 메시지만 전달
      throw new Error('Failed to fetch weather data');
    }
  }
}

