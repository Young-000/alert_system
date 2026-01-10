import { Injectable, Logger } from '@nestjs/common';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { BusApiClient, IBusApiClient } from './bus-api.client';
import { ApiCacheService } from '../cache/api-cache.service';

@Injectable()
export class CachedBusApiClient implements IBusApiClient {
  private readonly logger = new Logger(CachedBusApiClient.name);
  private readonly busClient: BusApiClient;

  constructor(
    private readonly cacheService: ApiCacheService,
    apiKey?: string,
  ) {
    this.busClient = new BusApiClient(apiKey || process.env.BUS_API_KEY || '');
  }

  async getBusArrival(stopId: string): Promise<BusArrival[]> {
    const startTime = Date.now();

    // 1. 캐시 확인 (30초 TTL이므로 실시간성 유지)
    const cached = await this.cacheService.getBusCache(stopId);
    if (cached) {
      this.logger.debug(`Returning cached bus arrivals for ${stopId}`);
      return cached.arrivals.map(
        (a) =>
          new BusArrival(
            a.stopId,
            a.routeId,
            a.routeName,
            a.arrivalTime,
            a.stationOrder,
          ),
      );
    }

    // 2. API 호출
    try {
      const arrivals = await this.busClient.getBusArrival(stopId);
      const responseTime = Date.now() - startTime;

      // 3. 캐시 저장
      await this.cacheService.setBusCache(
        stopId,
        arrivals.map((a) => ({
          stopId: a.stopId,
          routeId: a.routeId,
          routeName: a.routeName,
          arrivalTime: a.arrivalTime,
          stationOrder: a.remainingStops,
        })),
      );

      // 4. API 호출 로그
      await this.cacheService.logApiCall({
        apiName: 'SeoulBus',
        endpoint: `/getArrInfoByStId?stId=${stopId}`,
        success: true,
        responseTimeMs: responseTime,
      });

      return arrivals;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.cacheService.logApiCall({
        apiName: 'SeoulBus',
        endpoint: `/getArrInfoByStId?stId=${stopId}`,
        success: false,
        responseTimeMs: responseTime,
        errorMessage,
      });

      throw error;
    }
  }
}
