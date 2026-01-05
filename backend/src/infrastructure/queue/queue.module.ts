import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessor } from './notification.processor';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { NhnAlimtalkClient } from '@infrastructure/external-apis/kakao-alimtalk.client';
import { AlimtalkNotificationService } from '@infrastructure/alimtalk/alimtalk-notification.service';
import { SendAlimtalkUseCase } from '@application/use-cases/send-alimtalk.use-case';
import { DataSource } from 'typeorm';
import { Queue } from 'bullmq';

@Module({
  imports: [
    DatabaseModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    NotificationProcessor,
    // Repositories
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => new PostgresUserRepository(dataSource),
      inject: [DataSource],
    },
    {
      provide: 'IAlertRepository',
      useFactory: (dataSource: DataSource) => new PostgresAlertRepository(dataSource),
      inject: [DataSource],
    },
    // External APIs
    {
      provide: 'IWeatherApiClient',
      useFactory: () => new WeatherApiClient(process.env.OPENWEATHER_API_KEY || ''),
    },
    {
      provide: 'IAirQualityApiClient',
      useFactory: () => new AirQualityApiClient(process.env.AIR_QUALITY_API_KEY || ''),
    },
    {
      provide: 'IBusApiClient',
      useFactory: () => new BusApiClient(process.env.SEOUL_BUS_API_KEY || ''),
    },
    {
      provide: 'ISubwayApiClient',
      useFactory: () => new SubwayApiClient(process.env.SEOUL_SUBWAY_API_KEY || ''),
    },
    // Alimtalk
    {
      provide: 'IKakaoAlimtalkClient',
      useFactory: () =>
        new NhnAlimtalkClient(
          process.env.NHN_APP_KEY || '',
          process.env.NHN_SECRET_KEY || '',
          process.env.NHN_SENDER_KEY || ''
        ),
    },
    {
      provide: 'IAlimtalkNotificationService',
      useFactory: (client: any) => new AlimtalkNotificationService(client),
      inject: ['IKakaoAlimtalkClient'],
    },
    // Use Cases
    {
      provide: 'SendAlimtalkUseCase',
      useFactory: (
        alertRepo: any,
        userRepo: any,
        weatherApi: any,
        airQualityApi: any,
        busApi: any,
        subwayApi: any,
        alimtalkService: any
      ) =>
        new SendAlimtalkUseCase(
          alertRepo,
          userRepo,
          weatherApi,
          airQualityApi,
          busApi,
          subwayApi,
          alimtalkService
        ),
      inject: [
        'IAlertRepository',
        'IUserRepository',
        'IWeatherApiClient',
        'IAirQualityApiClient',
        'IBusApiClient',
        'ISubwayApiClient',
        'IAlimtalkNotificationService',
      ],
    },
    // Scheduler Service
    {
      provide: NotificationSchedulerService,
      useFactory: (queue: Queue, alertRepo: any) =>
        new NotificationSchedulerService(queue, alertRepo),
      inject: [getQueueToken('notifications'), 'IAlertRepository'],
    },
  ],
  exports: [NotificationSchedulerService, BullModule],
})
export class QueueModule {}
