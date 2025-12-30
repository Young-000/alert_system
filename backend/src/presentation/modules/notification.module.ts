import { Module } from '@nestjs/common';
import { NotificationController } from '../controllers/notification.controller';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { PushNotificationService } from '@infrastructure/push/push-notification.service';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: 'IAlertRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresAlertRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: 'IWeatherApiClient',
      useFactory: () => {
        const apiKey = process.env.WEATHER_API_KEY || '';
        return new WeatherApiClient(apiKey);
      },
    },
    {
      provide: 'IAirQualityApiClient',
      useFactory: () => {
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
        return new AirQualityApiClient(apiKey);
      },
    },
    {
      provide: 'IBusApiClient',
      useFactory: () => {
        const apiKey = process.env.BUS_API_KEY || '';
        return new BusApiClient(apiKey);
      },
    },
    {
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey = process.env.SUBWAY_API_KEY || '';
        return new SubwayApiClient(apiKey);
      },
    },
    {
      provide: 'IPushNotificationService',
      useFactory: () => {
        return new PushNotificationService();
      },
    },
    SendNotificationUseCase,
  ],
})
export class NotificationModule {}

