import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { SubwayStationEntity } from './typeorm/subway-station.entity';
import { buildDataSourceOptions } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    TypeOrmModule.forFeature([
      UserEntity,
      AlertEntity,
      PushSubscriptionEntity,
      SubwayStationEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
