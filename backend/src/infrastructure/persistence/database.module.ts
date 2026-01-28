import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { SubwayStationEntity } from './typeorm/subway-station.entity';
import { WeatherCacheEntity } from './typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from './typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from './typeorm/transport-cache.entity';
import { NotificationRuleEntity } from './typeorm/notification-rule.entity';
import { BehaviorEventEntity } from './typeorm/behavior-event.entity';
import { UserPatternEntity } from './typeorm/user-pattern.entity';
import { CommuteRecordEntity } from './typeorm/commute-record.entity';
// Commute tracking entities
import { CommuteRouteEntity } from './typeorm/commute-route.entity';
import { RouteCheckpointEntity } from './typeorm/route-checkpoint.entity';
import { CommuteSessionEntity } from './typeorm/commute-session.entity';
import { CheckpointRecordEntity } from './typeorm/checkpoint-record.entity';
import { buildDataSourceOptions } from './database.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    TypeOrmModule.forFeature([
      UserEntity,
      AlertEntity,
      SubwayStationEntity,
      // Cache entities
      WeatherCacheEntity,
      AirQualityCacheEntity,
      SubwayArrivalCacheEntity,
      BusArrivalCacheEntity,
      ApiCallLogEntity,
      // Smart notification
      NotificationRuleEntity,
      // Behavior tracking
      BehaviorEventEntity,
      UserPatternEntity,
      CommuteRecordEntity,
      // Commute tracking
      CommuteRouteEntity,
      RouteCheckpointEntity,
      CommuteSessionEntity,
      CheckpointRecordEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
