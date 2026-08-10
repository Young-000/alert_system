import { CachedAirQualityApiClient } from './cached-air-quality-api.client';
import { ApiCacheService } from '../cache/api-cache.service';

describe('CachedAirQualityApiClient', () => {
  describe('시도명 결정 (캐시 조회 키)', () => {
    let getAirQualityCache: jest.Mock;
    let client: CachedAirQualityApiClient;

    function sidoNameOfLastCall(): string {
      return getAirQualityCache.mock.calls[0][0];
    }

    beforeEach(() => {
      getAirQualityCache = jest.fn().mockResolvedValue({
        stationName: '측정소',
        pm10: 30,
        pm25: 15,
        aqi: 50,
        status: 'Good',
      });
      const cacheService = {
        getAirQualityCache,
      } as unknown as ApiCacheService;
      client = new CachedAirQualityApiClient(cacheService, 'test-api-key');
    });

    it('서울 좌표는 서울로 조회한다', async () => {
      await client.getAirQuality(37.5665, 126.978);

      expect(sidoNameOfLastCall()).toBe('서울');
    });

    it('인천 좌표는 인천으로 조회한다', async () => {
      // 인천 부평 (37.4894, 126.7247) — 경기 범위에도 포함되는 좌표다.
      await client.getAirQuality(37.4894, 126.7247);

      expect(sidoNameOfLastCall()).toBe('인천');
    });

    it('경기 좌표는 경기로 조회한다', async () => {
      // 수원 (37.2636, 127.0286) — 인천 위도 범위 밖.
      await client.getAirQuality(37.2636, 127.0286);

      expect(sidoNameOfLastCall()).toBe('경기');
    });

    it('범위 밖 좌표는 기본값 서울로 조회한다', async () => {
      // 부산 (35.1796, 129.0756)
      await client.getAirQuality(35.1796, 129.0756);

      expect(sidoNameOfLastCall()).toBe('서울');
    });
  });
});
