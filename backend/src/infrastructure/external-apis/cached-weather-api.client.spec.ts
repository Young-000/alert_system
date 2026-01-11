import { CachedWeatherApiClient } from './cached-weather-api.client';
import { ApiCacheService } from '../cache/api-cache.service';
import { Weather } from '@domain/entities/weather.entity';
import { WeatherApiClient } from './weather-api.client';

// WeatherApiClient 모킹
jest.mock('./weather-api.client');

describe('CachedWeatherApiClient', () => {
  let cachedClient: CachedWeatherApiClient;
  let mockCacheService: jest.Mocked<ApiCacheService>;
  let mockWeatherClient: jest.Mocked<WeatherApiClient>;

  const mockWeather = new Weather(
    '서울 강남구',
    15.5,
    '맑음',
    60,
    3.5,
  );

  const mockCachedData = {
    id: 1,
    lat: 37.57,
    lng: 126.98,
    location: '서울 강남구',
    temperature: 15.5,
    condition: '맑음',
    humidity: 60,
    windSpeed: 3.5,
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCacheService = {
      getWeatherCache: jest.fn(),
      setWeatherCache: jest.fn(),
      logApiCall: jest.fn(),
    } as any;

    // WeatherApiClient 모킹 인스턴스
    mockWeatherClient = {
      getWeather: jest.fn(),
    } as any;

    (WeatherApiClient as jest.Mock).mockImplementation(() => mockWeatherClient);

    cachedClient = new CachedWeatherApiClient(mockCacheService, 'test-api-key');
  });

  describe('getWeather', () => {
    it('캐시에 데이터가 있으면 캐시에서 반환', async () => {
      mockCacheService.getWeatherCache.mockResolvedValue(mockCachedData as any);

      const result = await cachedClient.getWeather(37.5665, 126.978);

      expect(mockCacheService.getWeatherCache).toHaveBeenCalledWith(37.5665, 126.978);
      expect(mockWeatherClient.getWeather).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(Weather);
      expect(result.location).toBe('서울 강남구');
      expect(result.temperature).toBe(15.5);
    });

    it('캐시가 없으면 API 호출 후 캐시 저장', async () => {
      mockCacheService.getWeatherCache.mockResolvedValue(null);
      mockWeatherClient.getWeather.mockResolvedValue(mockWeather);
      mockCacheService.setWeatherCache.mockResolvedValue(mockCachedData as any);
      mockCacheService.logApiCall.mockResolvedValue(undefined);

      const result = await cachedClient.getWeather(37.5665, 126.978);

      expect(mockCacheService.getWeatherCache).toHaveBeenCalled();
      expect(mockWeatherClient.getWeather).toHaveBeenCalledWith(37.5665, 126.978);
      expect(mockCacheService.setWeatherCache).toHaveBeenCalledWith({
        lat: 37.5665,
        lng: 126.978,
        location: mockWeather.location,
        temperature: mockWeather.temperature,
        condition: mockWeather.condition,
        humidity: mockWeather.humidity,
        windSpeed: mockWeather.windSpeed,
      });
      expect(mockCacheService.logApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          apiName: 'OpenWeatherMap',
          success: true,
        }),
      );
      expect(result).toEqual(mockWeather);
    });

    it('API 호출 실패 시 에러 로깅 후 예외 전파', async () => {
      mockCacheService.getWeatherCache.mockResolvedValue(null);
      mockWeatherClient.getWeather.mockRejectedValue(new Error('API Error'));
      mockCacheService.logApiCall.mockResolvedValue(undefined);

      await expect(cachedClient.getWeather(37.5665, 126.978)).rejects.toThrow('API Error');

      expect(mockCacheService.logApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          apiName: 'OpenWeatherMap',
          success: false,
          errorMessage: 'API Error',
        }),
      );
    });

    it('캐시 데이터에서 숫자 변환 확인', async () => {
      const cachedWithStringNumbers = {
        ...mockCachedData,
        temperature: '20.5', // 문자열로 저장된 경우
        windSpeed: '5.0',
      };
      mockCacheService.getWeatherCache.mockResolvedValue(cachedWithStringNumbers as any);

      const result = await cachedClient.getWeather(37.5665, 126.978);

      expect(result.temperature).toBe(20.5);
      expect(result.windSpeed).toBe(5);
    });
  });
});
