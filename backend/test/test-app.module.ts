import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TestDatabaseModule } from './test-database.module';
import { AuthModule } from '../src/presentation/modules/auth.module';
import { UserModule } from '../src/presentation/modules/user.module';
import { AlertModule } from '../src/presentation/modules/alert.module';
import { NotificationModule } from '../src/presentation/modules/notification.module';
import { AirQualityModule } from '../src/presentation/modules/air-quality.module';
import { SubwayModule } from '../src/presentation/modules/subway.module';
import { BusModule } from '../src/presentation/modules/bus.module';
import { JwtAuthGuard } from '../src/infrastructure/auth/jwt-auth.guard';

/**
 * 테스트용 App 모듈
 * 실제 DatabaseModule 대신 TestDatabaseModule(SQLite) 사용
 * QueueModule 제외 (Redis 불필요)
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TestDatabaseModule,
    // Rate Limiting: 테스트에서는 높은 제한
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 1000,
    }]),
    AuthModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    SubwayModule,
    BusModule,
  ],
  providers: [
    // 전역 JWT 인증 가드
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 전역 Rate Limiting 가드
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class TestAppModule {}
