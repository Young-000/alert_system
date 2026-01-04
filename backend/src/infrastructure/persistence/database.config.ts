import { DataSourceOptions } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as dotenv from 'dotenv';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { SubwayStationEntity } from './typeorm/subway-station.entity';

export function buildDataSourceOptions(): DataSourceOptions {
  dotenv.config();
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;
  const hasUrl = Boolean(databaseUrl);
  const isSupabase = Boolean(process.env.SUPABASE_URL) || Boolean(databaseUrl?.includes('supabase.co'));
  const synchronize =
    process.env.DB_SYNCHRONIZE === 'true' ||
    (!hasUrl && process.env.NODE_ENV === 'development');

  const baseOptions: PostgresConnectionOptions = {
    type: 'postgres',
    entities: [UserEntity, AlertEntity, PushSubscriptionEntity, SubwayStationEntity],
    synchronize,
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
  };
}
