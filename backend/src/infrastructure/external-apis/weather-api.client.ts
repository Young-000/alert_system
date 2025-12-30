import axios, { AxiosInstance } from 'axios';
import { Weather } from '@domain/entities/weather.entity';

export interface IWeatherApiClient {
  getWeather(lat: number, lng: number): Promise<Weather>;
}

export class WeatherApiClient implements IWeatherApiClient {
  private client: AxiosInstance;

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
      throw new Error(`Failed to fetch weather: ${error}`);
    }
  }
}

