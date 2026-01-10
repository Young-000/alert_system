import { Injectable, Logger } from '@nestjs/common';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { SubwayApiClient, ISubwayApiClient } from './subway-api.client';
import { ApiCacheService } from '../cache/api-cache.service';

@Injectable()
export class CachedSubwayApiClient implements ISubwayApiClient {
  private readonly logger = new Logger(CachedSubwayApiClient.name);
  private readonly subwayClient: SubwayApiClient;

  constructor(
    private readonly cacheService: ApiCacheService,
    apiKey?: string,
  ) {
    this.subwayClient = new SubwayApiClient(apiKey);
  }

  async getSubwayArrival(stationName: string): Promise<SubwayArrival[]> {
    const startTime = Date.now();

    // 1. 캐시 확인 (30초 TTL이므로 실시간성 유지)
    const cached = await this.cacheService.getSubwayCache(stationName);
    if (cached) {
      this.logger.debug(`Returning cached subway arrivals for ${stationName}`);
      return cached.arrivals.map(
        (a) =>
          new SubwayArrival(
            a.stationId,
            a.subwayId,
            a.direction,
            a.arrivalTime,
            a.destination,
          ),
      );
    }

    // 2. API 호출
    try {
      const arrivals = await this.subwayClient.getSubwayArrival(stationName);
      const responseTime = Date.now() - startTime;

      // 3. 캐시 저장
      await this.cacheService.setSubwayCache(
        stationName,
        arrivals.map((a) => ({
          stationId: a.stationId,
          subwayId: a.lineId,
          direction: a.direction,
          arrivalTime: a.arrivalTime,
          destination: a.destination,
        })),
      );

      // 4. API 호출 로그
      await this.cacheService.logApiCall({
        apiName: 'SeoulSubway',
        endpoint: `/realtimeStationArrival/${stationName}`,
        success: true,
        responseTimeMs: responseTime,
      });

      return arrivals;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.cacheService.logApiCall({
        apiName: 'SeoulSubway',
        endpoint: `/realtimeStationArrival/${stationName}`,
        success: false,
        responseTimeMs: responseTime,
        errorMessage,
      });

      throw error;
    }
  }
}
