import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as dotenv from 'dotenv';
import * as pg from 'pg';
import { Logger } from '@nestjs/common';
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
// Alternative route entities
import { AlternativeMappingEntity } from './typeorm/alternative-mapping.entity';
// Congestion entities
import { SegmentCongestionEntity } from './typeorm/segment-congestion.entity';

export function buildDataSourceOptions(): DataSourceOptions {
  dotenv.config();

  // SQLite 모드 지원 (E2E 테스트용)
  const useSqlite = process.env.USE_SQLITE === 'true';
  if (useSqlite) {
    const allEntities = [
      UserEntity,
      AlertEntity,
      SubwayStationEntity,
      WeatherCacheEntity,
      AirQualityCacheEntity,
      SubwayArrivalCacheEntity,
      BusArrivalCacheEntity,
      ApiCallLogEntity,
      NotificationRuleEntity,
      BehaviorEventEntity,
      UserPatternEntity,
      CommuteRecordEntity,
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
      // Alternative route
      AlternativeMappingEntity,
      // Congestion
      SegmentCongestionEntity,
    ];
    const sqliteOptions: SqliteConnectionOptions = {
      type: 'sqlite',
      database: process.env.SQLITE_DATABASE || ':memory:',
      entities: allEntities,
      synchronize: true,
    };
    return sqliteOptions;
  }

  // Support global env var from ~/.zshrc (SUPABASE_PROJECT2_DB_URL) as fallback
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_PROJECT2_DB_URL;
  const hasUrl = Boolean(databaseUrl);
  // Detect Supabase from URL, SUPABASE_URL env, or DATABASE_HOST (for pooler connections)
  const isSupabase = Boolean(process.env.SUPABASE_URL) ||
                     Boolean(databaseUrl?.includes('supabase.co')) ||
                     Boolean(process.env.DATABASE_HOST?.includes('supabase.com'));
  const synchronize =
    process.env.NODE_ENV !== 'production' &&
    process.env.DB_SYNCHRONIZE === 'true';

  const allEntities = [
    UserEntity,
    AlertEntity,
    SubwayStationEntity,
    WeatherCacheEntity,
    AirQualityCacheEntity,
    SubwayArrivalCacheEntity,
    BusArrivalCacheEntity,
    ApiCallLogEntity,
    NotificationRuleEntity,
    BehaviorEventEntity,
    UserPatternEntity,
    CommuteRecordEntity,
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
    // Alternative route
    AlternativeMappingEntity,
    // Congestion
    SegmentCongestionEntity,
  ];

  const baseOptions: PostgresConnectionOptions = {
    type: 'postgres',
    entities: allEntities,
    synchronize,
    schema: 'alert_system', // Supabase 전용 스키마 사용
  };

  const connectionOptions: Partial<PostgresConnectionOptions> = hasUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'alert_user',
        password: process.env.DATABASE_PASSWORD || 'alert_password',
        database: process.env.DATABASE_NAME || 'alert_system',
      };

  const sslOptions: Partial<PostgresConnectionOptions> = isSupabase
    ? { ssl: { rejectUnauthorized: false }, extra: { ssl: { rejectUnauthorized: false } } }
    : { ssl: false };

  // Connection pool 설정
  const isProduction = process.env.NODE_ENV === 'production';
  const poolSize = parseInt(process.env.DB_POOL_SIZE || (isProduction ? '10' : '5'));
  const poolOptions = {
    max: poolSize,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Logging 설정
  const logging = isProduction
    ? ['error' as const, 'warn' as const]
    : ['error' as const, 'warn' as const, 'query' as const];

  // SSL extra와 pool 설정 머지
  const existingExtra = (sslOptions as { extra?: Record<string, unknown> }).extra || {};

  const dbLogger = new Logger('DatabaseConfig');
  dbLogger.log(`Database config: pool=${poolSize}, logging=${logging.join(',')}, ssl=${isSupabase}`);

  return {
    ...baseOptions,
    ...connectionOptions,
    ...sslOptions,
    extra: { ...existingExtra, ...poolOptions },
    logging,
    // Fix for pg/TypeORM ESM/CommonJS compatibility
    driver: pg,
  };
}
