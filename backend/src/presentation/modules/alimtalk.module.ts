import { Module } from '@nestjs/common';
import { AlimtalkController } from '../controllers/alimtalk.controller';
import { SendAlimtalkUseCase } from '@application/use-cases/send-alimtalk.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import {
  KakaoAlimtalkClient,
  NhnAlimtalkClient,
} from '@infrastructure/external-apis/kakao-alimtalk.client';
import { AlimtalkNotificationService } from '@infrastructure/alimtalk/alimtalk-notification.service';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [AlimtalkController],
  providers: [
    // Repositories
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: 'IAlertRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresAlertRepository(dataSource);
      },
      inject: [DataSource],
    },
    // External API Clients
    {
      provide: 'IWeatherApiClient',
      useFactory: () => {
        const apiKey = process.env.OPENWEATHER_API_KEY || '';
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
        const apiKey = process.env.SEOUL_BUS_API_KEY || '';
        return new BusApiClient(apiKey);
      },
    },
    {
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey = process.env.SEOUL_SUBWAY_API_KEY || '';
        return new SubwayApiClient(apiKey);
      },
    },
    // Alimtalk Client (NHN Cloud 기본, Kakao로 변경 가능)
    {
      provide: 'IKakaoAlimtalkClient',
      useFactory: () => {
        const provider = process.env.ALIMTALK_PROVIDER || 'nhn';

        if (provider === 'kakao') {
          return new KakaoAlimtalkClient({
            apiKey: process.env.KAKAO_API_KEY || '',
            apiSecret: process.env.KAKAO_API_SECRET || '',
            senderKey: process.env.KAKAO_SENDER_KEY || '',
            pfId: process.env.KAKAO_PF_ID || '',
          });
        }

        // Default: NHN Cloud
        return new NhnAlimtalkClient(
          process.env.NHN_APP_KEY || '',
          process.env.NHN_SECRET_KEY || '',
          process.env.NHN_SENDER_KEY || ''
        );
      },
    },
    // Alimtalk Notification Service
    {
      provide: 'IAlimtalkNotificationService',
      useFactory: (alimtalkClient: any) => {
        return new AlimtalkNotificationService(alimtalkClient);
      },
      inject: ['IKakaoAlimtalkClient'],
    },
    // Use Cases
    {
      provide: 'SendAlimtalkUseCase',
      useFactory: (
        alertRepository: any,
        userRepository: any,
        weatherApiClient: any,
        airQualityApiClient: any,
        busApiClient: any,
        subwayApiClient: any,
        alimtalkService: any
      ) => {
        return new SendAlimtalkUseCase(
          alertRepository,
          userRepository,
          weatherApiClient,
          airQualityApiClient,
          busApiClient,
          subwayApiClient,
          alimtalkService
        );
      },
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
  ],
  exports: ['SendAlimtalkUseCase', 'IAlimtalkNotificationService'],
})
export class AlimtalkModule {}
