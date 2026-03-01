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
import { RouteAnalyticsEntity } from './typeorm/route-analytics.entity';
import { NotificationLogEntity } from './typeorm/notification-log.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
// Geofence entities
import { UserPlaceEntity } from './typeorm/user-place.entity';
import { CommuteEventEntity } from './typeorm/commute-event.entity';
// Smart departure entities
import { SmartDepartureSettingEntity } from './typeorm/smart-departure-setting.entity';
import { SmartDepartureSnapshotEntity } from './typeorm/smart-departure-snapshot.entity';
// Challenge system entities
import { ChallengeTemplateEntity } from './typeorm/challenge-template.entity';
import { UserChallengeEntity } from './typeorm/user-challenge.entity';
import { UserBadgeEntity } from './typeorm/user-badge.entity';
// Mission system entities
import { MissionEntity } from './typeorm/mission.entity';
import { DailyMissionRecordEntity } from './typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from './typeorm/mission-score.entity';
// Streak entities
import { CommuteStreakOrmEntity } from './typeorm/commute-streak.orm-entity';
import { StreakDailyLogOrmEntity } from './typeorm/streak-daily-log.orm-entity';
// Live Activity entities
import { LiveActivityTokenEntity } from './typeorm/live-activity-token.entity';
import { buildDataSourceOptions } from './database.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...buildDataSourceOptions(),
      autoLoadEntities: true,
      retryAttempts: process.env.NODE_ENV === 'production' ? 3 : 1,
      retryDelay: 3000,
    }),
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
      RouteAnalyticsEntity,
      NotificationLogEntity,
      PushSubscriptionEntity,
      // Geofence
      UserPlaceEntity,
      CommuteEventEntity,
      // Smart departure
      SmartDepartureSettingEntity,
      SmartDepartureSnapshotEntity,
      // Challenge system
      ChallengeTemplateEntity,
      UserChallengeEntity,
      UserBadgeEntity,
      // Mission system
      MissionEntity,
      DailyMissionRecordEntity,
      MissionScoreEntity,
      // Streak
      CommuteStreakOrmEntity,
      StreakDailyLogOrmEntity,
      // Live Activity
      LiveActivityTokenEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
