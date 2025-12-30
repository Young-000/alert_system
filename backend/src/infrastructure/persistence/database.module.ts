import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './typeorm/user.entity';
import { AlertEntity } from './typeorm/alert.entity';
import { AlertAlertTypeEntity } from './typeorm/alert-alert-type.entity';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Supabase 사용 시 SUPABASE_URL이 있으면 Supabase 연결, 없으면 로컬 PostgreSQL
      url: process.env.SUPABASE_URL
        ? process.env.SUPABASE_URL
        : undefined,
      host: process.env.SUPABASE_URL
        ? undefined
        : process.env.DATABASE_HOST || 'localhost',
      port: process.env.SUPABASE_URL
        ? undefined
        : parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.SUPABASE_URL
        ? undefined
        : process.env.DATABASE_USER || 'alert_user',
      password: process.env.SUPABASE_URL
        ? undefined
        : process.env.DATABASE_PASSWORD || 'alert_password',
      database: process.env.SUPABASE_URL
        ? undefined
        : process.env.DATABASE_NAME || 'alert_system',
      ssl: process.env.SUPABASE_URL
        ? { rejectUnauthorized: false }
        : false,
      entities: [UserEntity, AlertEntity, AlertAlertTypeEntity, PushSubscriptionEntity],
      synchronize: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([UserEntity, AlertEntity, AlertAlertTypeEntity, PushSubscriptionEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

