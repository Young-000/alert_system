import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { AuthModule } from './modules/auth.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';
import { SubwayModule } from './modules/subway.module';
import { BusModule } from './modules/bus.module';
import { WeatherModule } from './modules/weather.module';
import { BehaviorModule } from './modules/behavior.module';
import { PrivacyModule } from './modules/privacy.module';
import { CommuteModule } from './modules/commute.module';
import { NotificationHistoryModule } from './modules/notification-history.module';
import { PushModule } from './modules/push.module';
import { WidgetModule } from './modules/widget.module';
import { GeofenceModule } from './modules/geofence.module';
import { SmartDepartureModule } from './modules/smart-departure.module';
import { LiveActivityModule } from './modules/live-activity.module';
import { ChallengeModule } from './modules/challenge.module';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { HealthController } from './controllers/health.controller';
import { DevController } from './controllers/dev.controller';

// 개발 모드에서만 DevController 활성화
const isDev = process.env.NODE_ENV !== 'production';

@Module({
  controllers: isDev ? [HealthController, DevController] : [HealthController],
  imports: [
    DatabaseModule,
    // Rate Limiting: 1분에 60회 요청 제한
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    AuthModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    SubwayModule,
    BusModule,
    WeatherModule,
    BehaviorModule,
    PrivacyModule,
    CommuteModule,
    NotificationHistoryModule,
    PushModule,
    WidgetModule,
    GeofenceModule,
    SmartDepartureModule,
    LiveActivityModule,
    ChallengeModule,
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
export class AppModule {}
