import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { SubwayStationEntity } from './typeorm/subway-station.entity';
import { WeatherCacheEntity } from './typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from './typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from './typeorm/transport-cache.entity';
import { buildDataSourceOptions } from './database.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    TypeOrmModule.forFeature([
      UserEntity,
      AlertEntity,
      PushSubscriptionEntity,
      SubwayStationEntity,
      // Cache entities
      WeatherCacheEntity,
      AirQualityCacheEntity,
      SubwayArrivalCacheEntity,
      BusArrivalCacheEntity,
      ApiCallLogEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
