import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../src/infrastructure/persistence/typeorm/user.entity';
import { AlertEntity } from '../src/infrastructure/persistence/typeorm/alert.entity';
import { PushSubscriptionEntity } from '../src/infrastructure/persistence/typeorm/push-subscription.entity';
import { SubwayStationEntity } from '../src/infrastructure/persistence/typeorm/subway-station.entity';
import { WeatherCacheEntity } from '../src/infrastructure/persistence/typeorm/weather-cache.entity';
import { AirQualityCacheEntity } from '../src/infrastructure/persistence/typeorm/air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from '../src/infrastructure/persistence/typeorm/transport-cache.entity';

/**
 * 테스트용 데이터베이스 모듈
 * SQLite 인메모리 데이터베이스를 사용하여 E2E 테스트 실행
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      entities: [
        UserEntity,
        AlertEntity,
        PushSubscriptionEntity,
        SubwayStationEntity,
        WeatherCacheEntity,
        AirQualityCacheEntity,
        SubwayArrivalCacheEntity,
        BusArrivalCacheEntity,
        ApiCallLogEntity,
      ],
      synchronize: true,
      dropSchema: true,
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      AlertEntity,
      PushSubscriptionEntity,
      SubwayStationEntity,
      WeatherCacheEntity,
      AirQualityCacheEntity,
      SubwayArrivalCacheEntity,
      BusArrivalCacheEntity,
      ApiCallLogEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TestDatabaseModule {}
