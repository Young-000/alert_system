import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as dotenv from 'dotenv';
import * as pg from 'pg';
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

  return {
    ...baseOptions,
    ...connectionOptions,
    ...sslOptions,
    // Fix for pg/TypeORM ESM/CommonJS compatibility
    driver: pg,
  };
}
