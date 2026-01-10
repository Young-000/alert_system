import { Injectable, Logger } from '@nestjs/common';
import { Weather } from '@domain/entities/weather.entity';
import { WeatherApiClient, IWeatherApiClient } from './weather-api.client';
import { ApiCacheService } from '../cache/api-cache.service';

@Injectable()
export class CachedWeatherApiClient implements IWeatherApiClient {
  private readonly logger = new Logger(CachedWeatherApiClient.name);
  private readonly weatherClient: WeatherApiClient;

  constructor(
    private readonly cacheService: ApiCacheService,
    apiKey?: string,
  ) {
    this.weatherClient = new WeatherApiClient(apiKey || process.env.WEATHER_API_KEY || '');
  }

  async getWeather(lat: number, lng: number): Promise<Weather> {
    const startTime = Date.now();

    // 1. 캐시 확인
    const cached = await this.cacheService.getWeatherCache(lat, lng);
    if (cached) {
      this.logger.debug(`Returning cached weather for ${lat}, ${lng}`);
      return new Weather(
        cached.location,
        Number(cached.temperature),
        cached.condition,
        cached.humidity,
        Number(cached.windSpeed),
      );
    }

    // 2. API 호출
    try {
      const weather = await this.weatherClient.getWeather(lat, lng);
      const responseTime = Date.now() - startTime;

      // 3. 캐시 저장
      await this.cacheService.setWeatherCache({
        lat,
        lng,
        location: weather.location,
        temperature: weather.temperature,
        condition: weather.condition,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
      });

      // 4. API 호출 로그
      await this.cacheService.logApiCall({
        apiName: 'OpenWeatherMap',
        endpoint: `/weather?lat=${lat}&lon=${lng}`,
        success: true,
        responseTimeMs: responseTime,
      });

      return weather;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.cacheService.logApiCall({
        apiName: 'OpenWeatherMap',
        endpoint: `/weather?lat=${lat}&lon=${lng}`,
        success: false,
        responseTimeMs: responseTime,
        errorMessage,
      });

      throw error;
    }
  }
}
