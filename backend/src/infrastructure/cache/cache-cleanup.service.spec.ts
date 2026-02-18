import { CacheCleanupService } from './cache-cleanup.service';
import { ApiCacheService } from './api-cache.service';

describe('CacheCleanupService', () => {
  let service: CacheCleanupService;
  let mockApiCacheService: jest.Mocked<ApiCacheService>;

  beforeEach(() => {
    mockApiCacheService = {
      cleanupExpiredCache: jest.fn(),
      cleanupOldLogs: jest.fn(),
      getWeatherCache: jest.fn(),
      setWeatherCache: jest.fn(),
      getAirQualityCache: jest.fn(),
      setAirQualityCache: jest.fn(),
      getSubwayCache: jest.fn(),
      setSubwayCache: jest.fn(),
      getBusCache: jest.fn(),
      setBusCache: jest.fn(),
      logApiCall: jest.fn(),
      getTodayApiCallCount: jest.fn(),
    } as unknown as jest.Mocked<ApiCacheService>;

    service = new CacheCleanupService(mockApiCacheService);
  });

  describe('handleCacheCleanup', () => {
    it('만료된 캐시 정리를 실행한다', async () => {
      mockApiCacheService.cleanupExpiredCache.mockResolvedValue();

      await service.handleCacheCleanup();

      expect(mockApiCacheService.cleanupExpiredCache).toHaveBeenCalledTimes(1);
    });

    it('캐시 정리 실패 시 에러를 전파한다', async () => {
      mockApiCacheService.cleanupExpiredCache.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.handleCacheCleanup()).rejects.toThrow('DB connection lost');
    });
  });

  describe('handleLogCleanup', () => {
    it('오래된 API 로그 정리를 실행한다', async () => {
      mockApiCacheService.cleanupOldLogs.mockResolvedValue();

      await service.handleLogCleanup();

      expect(mockApiCacheService.cleanupOldLogs).toHaveBeenCalledTimes(1);
    });

    it('로그 정리 실패 시 에러를 전파한다', async () => {
      mockApiCacheService.cleanupOldLogs.mockRejectedValue(new Error('Permission denied'));

      await expect(service.handleLogCleanup()).rejects.toThrow('Permission denied');
    });
  });

  describe('스케줄 연동', () => {
    it('handleCacheCleanup와 handleLogCleanup를 순서대로 호출할 수 있다', async () => {
      mockApiCacheService.cleanupExpiredCache.mockResolvedValue();
      mockApiCacheService.cleanupOldLogs.mockResolvedValue();

      await service.handleCacheCleanup();
      await service.handleLogCleanup();

      expect(mockApiCacheService.cleanupExpiredCache).toHaveBeenCalledTimes(1);
      expect(mockApiCacheService.cleanupOldLogs).toHaveBeenCalledTimes(1);
    });

    it('캐시 정리와 로그 정리는 독립적으로 동작한다', async () => {
      mockApiCacheService.cleanupExpiredCache.mockRejectedValue(new Error('Cache error'));
      mockApiCacheService.cleanupOldLogs.mockResolvedValue();

      // Cache cleanup fails
      await expect(service.handleCacheCleanup()).rejects.toThrow();

      // Log cleanup should still work
      await service.handleLogCleanup();
      expect(mockApiCacheService.cleanupOldLogs).toHaveBeenCalledTimes(1);
    });
  });
});
