import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';
import { AlimtalkModule } from './modules/alimtalk.module';
import { AuthModule } from './modules/auth.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    AlimtalkModule,
    QueueModule,
  ],
})
export class AppModule {}

