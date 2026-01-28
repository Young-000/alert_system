import { Module, OnModuleInit, Inject, Optional, Logger } from '@nestjs/common';
import { SchedulerTriggerController } from '../controllers/scheduler-trigger.controller';
import { SchedulerLegacyController } from '../controllers/scheduler-legacy.controller';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { SmartNotificationModule } from './smart-notification.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { NotificationProcessor } from '@infrastructure/queue/notification.processor';
import { InMemoryNotificationSchedulerService } from '@infrastructure/queue/in-memory-notification-scheduler.service';
import { SolapiService, NoopSolapiService, SOLAPI_SERVICE } from '@infrastructure/messaging/solapi.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IAlertRepository } from '@domain/repositories/alert.repository';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

@Module({
  imports: [QueueModule, SmartNotificationModule, ConfigModule],
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
    ...(isQueueEnabled ? [NotificationProcessor] : []),
  ],
})
export class NotificationModule implements OnModuleInit {
  private readonly logger = new Logger(NotificationModule.name);

  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    @Inject('IAlertRepository')
    private readonly alertRepository: IAlertRepository,
    @Optional()
    @Inject(InMemoryNotificationSchedulerService)
    private readonly inMemoryScheduler?: InMemoryNotificationSchedulerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Wire up the notification handler for the in-memory scheduler
    if (!isQueueEnabled && this.inMemoryScheduler) {
      this.inMemoryScheduler.setNotificationHandler(async (alertId: string) => {
        await this.sendNotificationUseCase.execute(alertId);
      });

      // Load existing enabled alerts from DB and schedule them
      await this.loadAndScheduleExistingAlerts();
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
