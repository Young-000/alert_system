import { FactoryProvider } from '@nestjs/common';
import { ExternalApiModule } from './external-api.module';
import { ApiCacheService } from '@infrastructure/cache/api-cache.service';
import { CachedWeatherApiClient } from '@infrastructure/external-apis/cached-weather-api.client';
import { CachedAirQualityApiClient } from '@infrastructure/external-apis/cached-air-quality-api.client';
import { CachedSubwayApiClient } from '@infrastructure/external-apis/cached-subway-api.client';
import { CachedBusApiClient } from '@infrastructure/external-apis/cached-bus-api.client';
import { WeatherModule } from './weather.module';
import { AirQualityModule } from './air-quality.module';
import { SubwayModule } from './subway.module';
import { BusModule } from './bus.module';
import { WidgetModule } from './widget.module';
import { BriefingModule } from './briefing.module';
import { NotificationModule } from './notification.module';
import { AlternativeRouteModule } from './alternative-route.module';

/**
 * 외부 API 캐시 배선 회귀 방지.
 *
 * 캐시 래퍼가 구현만 되고 DI에 연결되지 않으면 아무 테스트도 실패하지 않은 채
 * 모든 외부 API 호출이 캐시를 우회한다(실제로 그 상태였다). 배선 자체를 검증한다.
 */
describe('ExternalApiModule', () => {
  const providers = Reflect.getMetadata('providers', ExternalApiModule) as FactoryProvider[];

  const factoryFor = (token: string): FactoryProvider => {
    const provider = providers.find((p) => p.provide === token);
    expect(provider).toBeDefined();
    return provider as FactoryProvider;
  };

  const cacheServiceStub = {} as ApiCacheService;

  it.each([
    ['IWeatherApiClient', CachedWeatherApiClient],
    ['IAirQualityApiClient', CachedAirQualityApiClient],
    ['ISubwayApiClient', CachedSubwayApiClient],
    ['IBusApiClient', CachedBusApiClient],
  ])('provides %s as a cache-backed client', (token, expectedClass) => {
    const provider = factoryFor(token);

    expect(provider.inject).toEqual([ApiCacheService]);
    expect(provider.useFactory(cacheServiceStub)).toBeInstanceOf(expectedClass);
  });

  it('exports every external API token', () => {
    const exported = Reflect.getMetadata('exports', ExternalApiModule) as string[];

    expect(exported).toEqual(
      expect.arrayContaining([
        'IWeatherApiClient',
        'IAirQualityApiClient',
        'ISubwayApiClient',
        'IBusApiClient',
      ]),
    );
  });

  it.each([
    ['WeatherModule', WeatherModule],
    ['AirQualityModule', AirQualityModule],
    ['SubwayModule', SubwayModule],
    ['BusModule', BusModule],
    ['WidgetModule', WidgetModule],
    ['BriefingModule', BriefingModule],
    ['NotificationModule', NotificationModule],
    ['AlternativeRouteModule', AlternativeRouteModule],
  ])('%s sources external API clients from ExternalApiModule', (_name, moduleClass) => {
    const imports = Reflect.getMetadata('imports', moduleClass) as unknown[];
    expect(imports).toContain(ExternalApiModule);

    // 자체 useFactory로 클라이언트를 다시 선언하면 캐시 우회가 되살아난다.
    const ownProviders = (Reflect.getMetadata('providers', moduleClass) ?? []) as Array<{
      provide?: unknown;
    }>;
    const redeclared = ownProviders
      .map((p) => p?.provide)
      .filter(
        (token) =>
          token === 'IWeatherApiClient' ||
          token === 'IAirQualityApiClient' ||
          token === 'ISubwayApiClient' ||
          token === 'IBusApiClient',
      );
    expect(redeclared).toEqual([]);
  });
});
