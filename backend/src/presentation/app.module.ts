import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
  ],
})
export class AppModule {}

