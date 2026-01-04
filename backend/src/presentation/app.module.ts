import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';
import { SubwayModule } from './modules/subway.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    SubwayModule,
  ],
})
export class AppModule {}
