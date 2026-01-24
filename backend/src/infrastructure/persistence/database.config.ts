import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as dotenv from 'dotenv';
import * as pg from 'pg';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { SubwayStationEntity } from './typeorm/subway-station.entity';

export function buildDataSourceOptions(): DataSourceOptions {
  dotenv.config();

  // SQLite 모드 지원 (E2E 테스트용)
  const useSqlite = process.env.USE_SQLITE === 'true';
  if (useSqlite) {
    const sqliteOptions: SqliteConnectionOptions = {
      type: 'sqlite',
      database: process.env.SQLITE_DATABASE || ':memory:',
      entities: [UserEntity, AlertEntity, PushSubscriptionEntity, SubwayStationEntity],
      synchronize: true,
    };
    return sqliteOptions;
  }

  // Support global env var from ~/.zshrc (SUPABASE_PROJECT2_DB_URL) as fallback
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_PROJECT2_DB_URL;
  const hasUrl = Boolean(databaseUrl);
  const isSupabase = Boolean(process.env.SUPABASE_URL) || Boolean(databaseUrl?.includes('supabase.co'));
  const synchronize =
    process.env.DB_SYNCHRONIZE === 'true' ||
    (!hasUrl && process.env.NODE_ENV === 'development');

  const baseOptions: PostgresConnectionOptions = {
    type: 'postgres',
    entities: [UserEntity, AlertEntity, PushSubscriptionEntity, SubwayStationEntity],
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
