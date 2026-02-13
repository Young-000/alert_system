import { Module, OnModuleInit, Inject, Optional, Logger } from '@nestjs/common';
import { SchedulerTriggerController } from '../controllers/scheduler-trigger.controller';
import { SchedulerLegacyController } from '../controllers/scheduler-legacy.controller';
import { SchedulerModule } from '@infrastructure/scheduler/scheduler.module';
import { SmartNotificationModule } from './smart-notification.module';
import { CommuteModule } from './commute.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { GenerateWeeklyReportUseCase } from '@application/use-cases/generate-weekly-report.use-case';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { NotificationProcessor } from '@infrastructure/queue/notification.processor';
import { InMemoryNotificationSchedulerService } from '@infrastructure/queue/in-memory-notification-scheduler.service';
import { SolapiService, NoopSolapiService, SOLAPI_SERVICE } from '@infrastructure/messaging/solapi.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';
import { NotificationLogEntity } from '@infrastructure/persistence/typeorm/notification-log.entity';
import { PushModule } from './push.module';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';
const isAWSSchedulerEnabled = process.env.AWS_SCHEDULER_ENABLED === 'true';

@Module({
  imports: [SchedulerModule.forRoot(), SmartNotificationModule, ConfigModule, CommuteModule, TypeOrmModule.forFeature([NotificationLogEntity, CommuteSessionEntity]), PushModule],
  controllers: [SchedulerTriggerController, SchedulerLegacyController],
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
        // 기상청 API는 공공데이터포털 키 사용 (미세먼지 API와 동일)
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
    SendNotificationUseCase,
    GenerateWeeklyReportUseCase,
    ...(isQueueEnabled ? [NotificationProcessor] : []),
  ],
})
export class NotificationModule implements OnModuleInit {
  private readonly logger = new Logger(NotificationModule.name);

  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    @Inject('IAlertRepository')
    private readonly alertRepository: IAlertRepository,
    @Inject('INotificationScheduler')
    private readonly scheduler: INotificationScheduler,
    @Optional()
    @Inject(InMemoryNotificationSchedulerService)
    private readonly inMemoryScheduler?: InMemoryNotificationSchedulerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Wire up the notification handler for the in-memory scheduler only
    // EventBridge scheduler calls /scheduler/trigger endpoint directly
    if (!isAWSSchedulerEnabled && this.inMemoryScheduler) {
      this.inMemoryScheduler.setNotificationHandler(async (alertId: string) => {
        await this.sendNotificationUseCase.execute(alertId);
      });

      // Load existing enabled alerts from DB and schedule them
      await this.loadAndScheduleExistingAlerts();
    }
    // EventBridge doesn't need to load alerts on startup - schedules are persistent in AWS
    else if (isAWSSchedulerEnabled) {
      this.logger.log('EventBridge Scheduler enabled - schedules are persisted in AWS');
    }
  }

  private async loadAndScheduleExistingAlerts(): Promise<void> {
    if (!this.inMemoryScheduler) return;

    try {
      const alerts = await this.alertRepository.findAll();
      const enabledAlerts = alerts.filter((alert) => alert.enabled);

      this.logger.log(
        `Loading ${enabledAlerts.length} enabled alerts from database...`,
      );

      for (const alert of enabledAlerts) {
        await this.inMemoryScheduler.scheduleNotification(alert);
      }

      this.logger.log(
        `Successfully scheduled ${enabledAlerts.length} alerts on startup`,
      );
    } catch (error) {
      this.logger.error('Failed to load and schedule existing alerts', error);
    }
  }
}
