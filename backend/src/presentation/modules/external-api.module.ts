import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { ApiCacheService } from '@infrastructure/cache/api-cache.service';
import { CachedWeatherApiClient } from '@infrastructure/external-apis/cached-weather-api.client';
import { CachedAirQualityApiClient } from '@infrastructure/external-apis/cached-air-quality-api.client';
import { CachedSubwayApiClient } from '@infrastructure/external-apis/cached-subway-api.client';
import { CachedBusApiClient } from '@infrastructure/external-apis/cached-bus-api.client';

/**
 * 외부 API 클라이언트 공용 모듈.
 *
 * 날씨·미세먼지·지하철·버스 클라이언트는 여러 기능 모듈(weather, widget, briefing,
 * notification 등)에서 같은 토큰으로 필요하다. 각 모듈이 따로 useFactory를 선언하면
 * 캐시 래퍼 배선이 한 곳만 누락돼도 조용히 raw 호출로 새기 때문에 여기로 모은다.
 *
 * 모든 클라이언트는 ApiCacheService(DB 캐시 + 호출 로그)를 경유한다.
 * 외부 API는 일일 호출 쿼터가 있고 관련 엔드포인트가 공개(@Public)라 캐시가 필수다.
 */
@Module({
  imports: [CacheModule],
  providers: [
    {
      provide: 'IWeatherApiClient',
      useFactory: (cacheService: ApiCacheService) => {
        // 공공데이터포털 통합 서비스키 (날씨·미세먼지 공용)
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
        return new CachedWeatherApiClient(cacheService, apiKey);
      },
      inject: [ApiCacheService],
    },
    {
      provide: 'IAirQualityApiClient',
      useFactory: (cacheService: ApiCacheService) => {
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
        return new CachedAirQualityApiClient(cacheService, apiKey);
      },
      inject: [ApiCacheService],
    },
    {
      provide: 'ISubwayApiClient',
      useFactory: (cacheService: ApiCacheService) => {
        const apiKey = process.env.SUBWAY_REALTIME_API_KEY || process.env.SUBWAY_API_KEY || '';
        return new CachedSubwayApiClient(cacheService, apiKey);
      },
      inject: [ApiCacheService],
    },
    {
      provide: 'IBusApiClient',
      useFactory: (cacheService: ApiCacheService) => {
        const apiKey = process.env.BUS_API_KEY || '';
        return new CachedBusApiClient(cacheService, apiKey);
      },
      inject: [ApiCacheService],
    },
  ],
  exports: ['IWeatherApiClient', 'IAirQualityApiClient', 'ISubwayApiClient', 'IBusApiClient'],
})
export class ExternalApiModule {}
