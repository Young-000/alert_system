import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { SchedulerTriggerController } from '../controllers/scheduler-trigger.controller';
import { SchedulerModule } from '@infrastructure/scheduler/scheduler.module';
import { SmartNotificationModule } from './smart-notification.module';
import { CommuteModule } from './commute.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { NotificationMessageBuilderService } from '@application/services/notification-message-builder.service';
import { GenerateWeeklyReportUseCase } from '@application/use-cases/generate-weekly-report.use-case';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { NotificationProcessor } from '@infrastructure/queue/notification.processor';
import { SolapiService, NoopSolapiService, SOLAPI_SERVICE } from '@infrastructure/messaging/solapi.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogEntity } from '@infrastructure/persistence/typeorm/notification-log.entity';
import { PushModule } from './push.module';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

@Module({
  imports: [SchedulerModule.forRoot(), SmartNotificationModule, ConfigModule, CommuteModule, TypeOrmModule.forFeature([NotificationLogEntity, CommuteSessionEntity]), PushModule],
  controllers: [SchedulerTriggerController],
  providers: [
    {
      provide: 'IAlertRepository',
      useClass: PostgresAlertRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
    {
      provide: 'ISubwayStationRepository',
      useClass: PostgresSubwayStationRepository,
    },
    {
      provide: 'IWeatherApiClient',
      useFactory: () => {
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
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
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey = process.env.SUBWAY_API_KEY || '';
        return new SubwayApiClient(apiKey);
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
      provide: SOLAPI_SERVICE,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('SOLAPI_API_KEY', '');
        const apiSecret = configService.get<string>('SOLAPI_API_SECRET', '');
        if (!apiKey || !apiSecret) {
          return new NoopSolapiService();
        }
        return new SolapiService(configService);
      },
      inject: [ConfigService],
    },
    NotificationMessageBuilderService,
    SendNotificationUseCase,
    GenerateWeeklyReportUseCase,
    ...(isQueueEnabled ? [NotificationProcessor] : []),
  ],
})
export class NotificationModule implements OnModuleInit {
  private readonly logger = new Logger(NotificationModule.name);

  async onModuleInit(): Promise<void> {
    // EventBridge Scheduler는 AWS에서 영구적으로 스케줄을 관리합니다.
    // 서버 시작 시 별도의 스케줄 로딩이 필요하지 않습니다.
    this.logger.log('EventBridge Scheduler enabled - schedules are persisted in AWS');
  }
}
