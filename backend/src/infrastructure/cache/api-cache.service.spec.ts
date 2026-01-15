import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ApiCacheService } from './api-cache.service';
import { WeatherCacheEntity } from '../persistence/typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from '../persistence/typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from '../persistence/typeorm/transport-cache.entity';

describe('ApiCacheService', () => {
  let service: ApiCacheService;
  let weatherCacheRepo: jest.Mocked<Repository<WeatherCacheEntity>>;
  let airQualityCacheRepo: jest.Mocked<Repository<AirQualityCacheEntity>>;
  let subwayCacheRepo: jest.Mocked<Repository<SubwayArrivalCacheEntity>>;
  let busCacheRepo: jest.Mocked<Repository<BusArrivalCacheEntity>>;
  let apiCallLogRepo: jest.Mocked<Repository<ApiCallLogEntity>>;

  const createMockRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  });

  beforeEach(async () => {
    weatherCacheRepo = createMockRepository() as any;
    airQualityCacheRepo = createMockRepository() as any;
    subwayCacheRepo = createMockRepository() as any;
    busCacheRepo = createMockRepository() as any;
    apiCallLogRepo = createMockRepository() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCacheService,
        {
          provide: getRepositoryToken(WeatherCacheEntity),
          useValue: weatherCacheRepo,
        },
        {
          provide: getRepositoryToken(AirQualityCacheEntity),
          useValue: airQualityCacheRepo,
        },
        {
          provide: getRepositoryToken(SubwayArrivalCacheEntity),
          useValue: subwayCacheRepo,
        },
        {
          provide: getRepositoryToken(BusArrivalCacheEntity),
          useValue: busCacheRepo,
        },
        {
          provide: getRepositoryToken(ApiCallLogEntity),
          useValue: apiCallLogRepo,
        },
      ],
    }).compile();

    service = module.get<ApiCacheService>(ApiCacheService);
  });

  describe('Weather Cache', () => {
    const mockWeatherCache = {
      id: 1,
      lat: 37.57,
      lng: 126.98,
      location: '서울',
      temperature: 15.5,
      condition: '맑음',
      humidity: 60,
      windSpeed: 3.5,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('getWeatherCache - 캐시 히트', async () => {
      weatherCacheRepo.findOne.mockResolvedValue(mockWeatherCache as any);

      const result = await service.getWeatherCache(37.5665, 126.978);

      expect(weatherCacheRepo.findOne).toHaveBeenCalledWith({
        where: {
          lat: 37.57, // 반올림됨
          lng: 126.98, // 반올림됨
          expiresAt: expect.any(Object),
        },
        order: { fetchedAt: 'DESC' },
      });
      expect(result).toEqual(mockWeatherCache);
    });

    it('getWeatherCache - 캐시 미스', async () => {
      weatherCacheRepo.findOne.mockResolvedValue(null);

      const result = await service.getWeatherCache(37.5665, 126.978);

      expect(result).toBeNull();
    });

    it('setWeatherCache - 캐시 저장', async () => {
      const inputData = {
        lat: 37.5665,
        lng: 126.978,
        location: '서울',
        temperature: 15.5,
        condition: '맑음',
        humidity: 60,
        windSpeed: 3.5,
      };

      weatherCacheRepo.create.mockReturnValue(mockWeatherCache as any);
      weatherCacheRepo.save.mockResolvedValue(mockWeatherCache as any);

      const result = await service.setWeatherCache(inputData);

      expect(weatherCacheRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 37.57, // 반올림됨
          lng: 126.98, // 반올림됨
          location: '서울',
          temperature: 15.5,
        }),
      );
      expect(weatherCacheRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockWeatherCache);
    });
  });

  describe('Air Quality Cache', () => {
    const mockAirQualityCache = {
      id: 1,
      sidoName: '서울',
      stationName: '강남구',
      pm10: 45,
      pm25: 22,
      aqi: 65,
      status: '보통',
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('getAirQualityCache - 캐시 히트', async () => {
      airQualityCacheRepo.findOne.mockResolvedValue(mockAirQualityCache as any);

      const result = await service.getAirQualityCache('서울');

      expect(airQualityCacheRepo.findOne).toHaveBeenCalledWith({
        where: {
          sidoName: '서울',
          expiresAt: expect.any(Object),
        },
        order: { fetchedAt: 'DESC' },
      });
      expect(result).toEqual(mockAirQualityCache);
    });

    it('setAirQualityCache - 캐시 저장', async () => {
      const inputData = {
        sidoName: '서울',
        stationName: '강남구',
        pm10: 45,
        pm25: 22,
        aqi: 65,
        status: '보통',
      };

      airQualityCacheRepo.create.mockReturnValue(mockAirQualityCache as any);
      airQualityCacheRepo.save.mockResolvedValue(mockAirQualityCache as any);

      const result = await service.setAirQualityCache(inputData);

      expect(airQualityCacheRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sidoName: '서울',
          stationName: '강남구',
        }),
      );
      expect(result).toEqual(mockAirQualityCache);
    });
  });

  describe('Subway Cache', () => {
    const mockSubwayCache = {
      id: 1,
      stationName: '강남',
      arrivals: [
        {
          stationId: '1234',
          subwayId: '2',
          direction: '외선',
          arrivalTime: 180,
          destination: '성수',
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 30000),
    };

    it('getSubwayCache - 캐시 히트', async () => {
      subwayCacheRepo.findOne.mockResolvedValue(mockSubwayCache as any);

      const result = await service.getSubwayCache('강남');

      expect(result).toEqual(mockSubwayCache);
    });

    it('setSubwayCache - 캐시 저장', async () => {
      const arrivals = mockSubwayCache.arrivals;
      subwayCacheRepo.create.mockReturnValue(mockSubwayCache as any);
      subwayCacheRepo.save.mockResolvedValue(mockSubwayCache as any);

      const result = await service.setSubwayCache('강남', arrivals);

      expect(subwayCacheRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stationName: '강남',
          arrivals,
        }),
      );
      expect(result).toEqual(mockSubwayCache);
    });
  });

  describe('Bus Cache', () => {
    const mockBusCache = {
      id: 1,
      stopId: 'stop-123',
      arrivals: [
        {
          stopId: 'stop-123',
          routeId: 'route-456',
          routeName: '146번',
          arrivalTime: 300,
          stationOrder: 5,
        },
      ],
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 30000),
    };

    it('getBusCache - 캐시 히트', async () => {
      busCacheRepo.findOne.mockResolvedValue(mockBusCache as any);

      const result = await service.getBusCache('stop-123');

      expect(result).toEqual(mockBusCache);
    });

    it('setBusCache - 캐시 저장', async () => {
      const arrivals = mockBusCache.arrivals;
      busCacheRepo.create.mockReturnValue(mockBusCache as any);
      busCacheRepo.save.mockResolvedValue(mockBusCache as any);

      const result = await service.setBusCache('stop-123', arrivals);

      expect(busCacheRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stopId: 'stop-123',
          arrivals,
        }),
      );
      expect(result).toEqual(mockBusCache);
    });
  });

  describe('API Call Logging', () => {
    it('logApiCall - 성공 로그 저장', async () => {
      const logData = {
        apiName: 'OpenWeatherMap',
        endpoint: '/weather',
        success: true,
        responseTimeMs: 250,
      };
      const mockLog = { id: 1, ...logData, calledAt: new Date() };
      apiCallLogRepo.create.mockReturnValue(mockLog as any);
      apiCallLogRepo.save.mockResolvedValue(mockLog as any);

      await service.logApiCall(logData);

      expect(apiCallLogRepo.create).toHaveBeenCalledWith(logData);
      expect(apiCallLogRepo.save).toHaveBeenCalled();
    });

    it('logApiCall - 실패 로그 저장 (에러 메시지 포함)', async () => {
      const logData = {
        apiName: 'OpenWeatherMap',
        endpoint: '/weather',
        success: false,
        responseTimeMs: 5000,
        errorMessage: 'Timeout',
      };
      const mockLog = { id: 1, ...logData, calledAt: new Date() };
      apiCallLogRepo.create.mockReturnValue(mockLog as any);
      apiCallLogRepo.save.mockResolvedValue(mockLog as any);

      await service.logApiCall(logData);

      expect(apiCallLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Timeout',
        }),
      );
    });

    it('getTodayApiCallCount - 오늘 API 호출 횟수 조회', async () => {
      apiCallLogRepo.count.mockResolvedValue(42);

      const result = await service.getTodayApiCallCount('OpenWeatherMap');

      expect(apiCallLogRepo.count).toHaveBeenCalledWith({
        where: {
          apiName: 'OpenWeatherMap',
          calledAt: expect.any(Object),
        },
      });
      expect(result).toBe(42);
    });
  });

  describe('Cache Cleanup', () => {
    it('cleanupExpiredCache - 만료된 캐시 삭제', async () => {
      weatherCacheRepo.delete.mockResolvedValue({ affected: 5, raw: [] });
      airQualityCacheRepo.delete.mockResolvedValue({ affected: 3, raw: [] });
      subwayCacheRepo.delete.mockResolvedValue({ affected: 10, raw: [] });
      busCacheRepo.delete.mockResolvedValue({ affected: 8, raw: [] });

      await service.cleanupExpiredCache();

      expect(weatherCacheRepo.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object),
      });
      expect(airQualityCacheRepo.delete).toHaveBeenCalled();
      expect(subwayCacheRepo.delete).toHaveBeenCalled();
      expect(busCacheRepo.delete).toHaveBeenCalled();
    });

    it('cleanupOldLogs - 7일 이전 로그 삭제', async () => {
      apiCallLogRepo.delete.mockResolvedValue({ affected: 100, raw: [] });

      await service.cleanupOldLogs();

      expect(apiCallLogRepo.delete).toHaveBeenCalledWith({
        calledAt: expect.any(Object),
      });
    });
  });
});
