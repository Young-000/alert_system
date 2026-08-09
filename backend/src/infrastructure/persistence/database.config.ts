import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import * as dotenv from 'dotenv';
import * as pg from 'pg';
import { Logger } from '@nestjs/common';
import { ALL_ENTITIES } from './typeorm/entities';

export function buildDataSourceOptions(): DataSourceOptions {
  dotenv.config();

  // SQLite 모드 지원 (E2E 테스트용)
  const useSqlite = process.env.USE_SQLITE === 'true';
  if (useSqlite) {
    const sqliteOptions: SqliteConnectionOptions = {
      type: 'sqlite',
      database: process.env.SQLITE_DATABASE || ':memory:',
      entities: ALL_ENTITIES,
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


  const baseOptions: PostgresConnectionOptions = {
    type: 'postgres',
    entities: ALL_ENTITIES,
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
