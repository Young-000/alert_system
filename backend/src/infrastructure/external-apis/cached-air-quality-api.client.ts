import { Injectable, Logger } from '@nestjs/common';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { AirQualityApiClient, IAirQualityApiClient } from './air-quality-api.client';
import { getSidoNameFromCoords } from './sido-name';
import { ApiCacheService } from '../cache/api-cache.service';

@Injectable()
export class CachedAirQualityApiClient implements IAirQualityApiClient {
  private readonly logger = new Logger(CachedAirQualityApiClient.name);
  private readonly airQualityClient: AirQualityApiClient;

  constructor(
    private readonly cacheService: ApiCacheService,
    apiKey?: string,
  ) {
    this.airQualityClient = new AirQualityApiClient(apiKey || process.env.AIR_QUALITY_API_KEY || '');
  }

  async getAirQuality(lat: number, lng: number): Promise<AirQuality> {
    const startTime = Date.now();
    const sidoName = this.getSidoName(lat, lng);

    // 1. 캐시 확인
    const cached = await this.cacheService.getAirQualityCache(sidoName);
    if (cached) {
      this.logger.debug(`Returning cached air quality for ${sidoName}`);
      return new AirQuality(
        cached.stationName,
        cached.pm10,
        cached.pm25,
        cached.aqi,
        cached.status,
      );
    }

    // 2. API 호출
    try {
      const airQuality = await this.airQualityClient.getAirQuality(lat, lng);
      const responseTime = Date.now() - startTime;

      // 3. 캐시 저장
      await this.cacheService.setAirQualityCache({
        sidoName,
        stationName: airQuality.location,
        pm10: airQuality.pm10,
        pm25: airQuality.pm25,
        aqi: airQuality.aqi,
        status: airQuality.status,
      });

      // 4. API 호출 로그
      await this.cacheService.logApiCall({
        apiName: 'AirQuality',
        endpoint: `/getCtprvnRltmMesureDnsty?sidoName=${sidoName}`,
        success: true,
        responseTimeMs: responseTime,
      });

      return airQuality;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.cacheService.logApiCall({
        apiName: 'AirQuality',
        endpoint: `/getCtprvnRltmMesureDnsty?sidoName=${sidoName}`,
        success: false,
        responseTimeMs: responseTime,
        errorMessage,
      });

      throw error;
    }
  }

  private getSidoName(lat: number, lng: number): string {
    return getSidoNameFromCoords(lat, lng);
  }
}
