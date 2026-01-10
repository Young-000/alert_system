import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WeatherCacheEntity } from '../persistence/typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from '../persistence/typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from '../persistence/typeorm/transport-cache.entity';
import { ApiCacheService } from './api-cache.service';
import { CacheCleanupService } from './cache-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WeatherCacheEntity,
      AirQualityCacheEntity,
      SubwayArrivalCacheEntity,
      BusArrivalCacheEntity,
      ApiCallLogEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [ApiCacheService, CacheCleanupService],
  exports: [ApiCacheService],
})
export class CacheModule {}
