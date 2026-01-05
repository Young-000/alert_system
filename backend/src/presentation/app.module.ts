import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { AuthModule } from './modules/auth.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';
import { SubwayModule } from './modules/subway.module';
import { BusModule } from './modules/bus.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    AuthModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    SubwayModule,
    BusModule,
  ],
})
export class AppModule {}
