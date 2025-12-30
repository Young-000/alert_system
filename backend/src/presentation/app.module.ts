import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserModule } from './modules/user.module';
import { AlertModule } from './modules/alert.module';
import { NotificationModule } from './modules/notification.module';
import { AirQualityModule } from './modules/air-quality.module';
import { WeatherModule } from './modules/weather.module';
import { BusModule } from './modules/bus.module';
import { SubwayModule } from './modules/subway.module';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    AlertModule,
    NotificationModule,
    AirQualityModule,
    WeatherModule,
    BusModule,
    SubwayModule,
  ],
})
export class AppModule {}

