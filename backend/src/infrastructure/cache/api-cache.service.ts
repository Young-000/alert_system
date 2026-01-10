import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { WeatherCacheEntity } from '../persistence/typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from '../persistence/typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from '../persistence/typeorm/transport-cache.entity';

// 캐시 TTL 설정 (밀리초)
const CACHE_TTL = {
  WEATHER: 60 * 60 * 1000, // 1시간
  AIR_QUALITY: 60 * 60 * 1000, // 1시간
  SUBWAY: 30 * 1000, // 30초
  BUS: 30 * 1000, // 30초
};

@Injectable()
export class ApiCacheService {
  private readonly logger = new Logger(ApiCacheService.name);

  constructor(
    @InjectRepository(WeatherCacheEntity)
    private weatherCacheRepo: Repository<WeatherCacheEntity>,
    @InjectRepository(AirQualityCacheEntity)
    private airQualityCacheRepo: Repository<AirQualityCacheEntity>,
    @InjectRepository(SubwayArrivalCacheEntity)
    private subwayCacheRepo: Repository<SubwayArrivalCacheEntity>,
    @InjectRepository(BusArrivalCacheEntity)
    private busCacheRepo: Repository<BusArrivalCacheEntity>,
    @InjectRepository(ApiCallLogEntity)
    private apiCallLogRepo: Repository<ApiCallLogEntity>,
  ) {}

  // ========== WEATHER CACHE ==========
  async getWeatherCache(lat: number, lng: number): Promise<WeatherCacheEntity | null> {
    // 위도/경도 반올림 (소수점 2자리까지 - 약 1km 범위)
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLng = Math.round(lng * 100) / 100;

    const cache = await this.weatherCacheRepo.findOne({
      where: {
        lat: roundedLat,
        lng: roundedLng,
        expiresAt: MoreThan(new Date()),
      },
      order: { fetchedAt: 'DESC' },
    });

    if (cache) {
      this.logger.debug(`Weather cache hit: ${roundedLat}, ${roundedLng}`);
    }
    return cache;
  }

  async setWeatherCache(data: {
    lat: number;
    lng: number;
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  }): Promise<WeatherCacheEntity> {
    const roundedLat = Math.round(data.lat * 100) / 100;
    const roundedLng = Math.round(data.lng * 100) / 100;

    const cache = this.weatherCacheRepo.create({
      lat: roundedLat,
      lng: roundedLng,
      location: data.location,
      temperature: data.temperature,
      condition: data.condition,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      expiresAt: new Date(Date.now() + CACHE_TTL.WEATHER),
    });

    const saved = await this.weatherCacheRepo.save(cache);
    this.logger.debug(`Weather cache saved: ${roundedLat}, ${roundedLng}`);
    return saved;
  }

  // ========== AIR QUALITY CACHE ==========
  async getAirQualityCache(sidoName: string): Promise<AirQualityCacheEntity | null> {
    const cache = await this.airQualityCacheRepo.findOne({
      where: {
        sidoName,
        expiresAt: MoreThan(new Date()),
      },
      order: { fetchedAt: 'DESC' },
    });

    if (cache) {
      this.logger.debug(`Air quality cache hit: ${sidoName}`);
    }
    return cache;
  }

  async setAirQualityCache(data: {
    sidoName: string;
    stationName: string;
    pm10: number;
    pm25: number;
    aqi: number;
    status: string;
  }): Promise<AirQualityCacheEntity> {
    const cache = this.airQualityCacheRepo.create({
      sidoName: data.sidoName,
      stationName: data.stationName,
      pm10: data.pm10,
      pm25: data.pm25,
      aqi: data.aqi,
      status: data.status,
      expiresAt: new Date(Date.now() + CACHE_TTL.AIR_QUALITY),
    });

    const saved = await this.airQualityCacheRepo.save(cache);
    this.logger.debug(`Air quality cache saved: ${data.sidoName}`);
    return saved;
  }

  // ========== SUBWAY CACHE ==========
  async getSubwayCache(stationName: string): Promise<SubwayArrivalCacheEntity | null> {
    const cache = await this.subwayCacheRepo.findOne({
      where: {
        stationName,
        expiresAt: MoreThan(new Date()),
      },
      order: { fetchedAt: 'DESC' },
    });

    if (cache) {
      this.logger.debug(`Subway cache hit: ${stationName}`);
    }
    return cache;
  }

  async setSubwayCache(
    stationName: string,
    arrivals: Array<{
      stationId: string;
      subwayId: string;
      direction: string;
      arrivalTime: number;
      destination: string;
    }>,
  ): Promise<SubwayArrivalCacheEntity> {
    const cache = this.subwayCacheRepo.create({
      stationName,
      arrivals,
      expiresAt: new Date(Date.now() + CACHE_TTL.SUBWAY),
    });

    const saved = await this.subwayCacheRepo.save(cache);
    this.logger.debug(`Subway cache saved: ${stationName}`);
    return saved;
  }

  // ========== BUS CACHE ==========
  async getBusCache(stopId: string): Promise<BusArrivalCacheEntity | null> {
    const cache = await this.busCacheRepo.findOne({
      where: {
        stopId,
        expiresAt: MoreThan(new Date()),
      },
      order: { fetchedAt: 'DESC' },
    });

    if (cache) {
      this.logger.debug(`Bus cache hit: ${stopId}`);
    }
    return cache;
  }

  async setBusCache(
    stopId: string,
    arrivals: Array<{
      stopId: string;
      routeId: string;
      routeName: string;
      arrivalTime: number;
      stationOrder: number;
    }>,
  ): Promise<BusArrivalCacheEntity> {
    const cache = this.busCacheRepo.create({
      stopId,
      arrivals,
      expiresAt: new Date(Date.now() + CACHE_TTL.BUS),
    });

    const saved = await this.busCacheRepo.save(cache);
    this.logger.debug(`Bus cache saved: ${stopId}`);
    return saved;
  }

  // ========== API CALL LOGGING ==========
  async logApiCall(data: {
    apiName: string;
    endpoint: string;
    success: boolean;
    responseTimeMs: number;
    errorMessage?: string;
  }): Promise<void> {
    const log = this.apiCallLogRepo.create({
      apiName: data.apiName,
      endpoint: data.endpoint,
      success: data.success,
      responseTimeMs: data.responseTimeMs,
      errorMessage: data.errorMessage,
    });

    await this.apiCallLogRepo.save(log);
  }

  // 오늘 API 호출 횟수 조회
  async getTodayApiCallCount(apiName: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.apiCallLogRepo.count({
      where: {
        apiName,
        calledAt: MoreThan(today),
      },
    });
  }

  // 만료된 캐시 정리 (주기적으로 호출)
  async cleanupExpiredCache(): Promise<void> {
    const now = new Date();

    const weatherDeleted = await this.weatherCacheRepo.delete({ expiresAt: LessThan(now) });
    const airQualityDeleted = await this.airQualityCacheRepo.delete({ expiresAt: LessThan(now) });
    const subwayDeleted = await this.subwayCacheRepo.delete({ expiresAt: LessThan(now) });
    const busDeleted = await this.busCacheRepo.delete({ expiresAt: LessThan(now) });

    this.logger.log(
      `Cache cleanup: weather=${weatherDeleted.affected}, airQuality=${airQualityDeleted.affected}, subway=${subwayDeleted.affected}, bus=${busDeleted.affected}`,
    );
  }

  // 7일 이전 API 로그 정리
  async cleanupOldLogs(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await this.apiCallLogRepo.delete({ calledAt: LessThan(sevenDaysAgo) });
    this.logger.log(`API log cleanup: ${deleted.affected} old logs deleted`);
  }
}
