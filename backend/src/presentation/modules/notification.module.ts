import { Module, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { NotificationController } from '../controllers/notification.controller';
import { SchedulerTriggerController } from '../controllers/scheduler-trigger.controller';
import { SchedulerLegacyController } from '../controllers/scheduler-legacy.controller';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { SmartNotificationModule } from './smart-notification.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { PostgresPushSubscriptionRepository } from '@infrastructure/persistence/postgres-push-subscription.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { SavePushSubscriptionUseCase } from '@application/use-cases/save-push-subscription.use-case';
import { RemovePushSubscriptionUseCase } from '@application/use-cases/remove-push-subscription.use-case';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { PushNotificationService } from '@infrastructure/push/push-notification.service';
import { NoopPushNotificationService } from '@infrastructure/push/noop-push-notification.service';
import { NotificationProcessor } from '@infrastructure/queue/notification.processor';
import { InMemoryNotificationSchedulerService } from '@infrastructure/queue/in-memory-notification-scheduler.service';
import { SolapiService, NoopSolapiService, SOLAPI_SERVICE } from '@infrastructure/messaging/solapi.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

@Module({
  imports: [QueueModule, SmartNotificationModule, ConfigModule],
  controllers: [NotificationController, SchedulerTriggerController, SchedulerLegacyController],
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
      provide: 'IPushSubscriptionRepository',
      useClass: PostgresPushSubscriptionRepository,
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
      provide: 'IPushNotificationService',
      useFactory: () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY || '';
        const privateKey = process.env.VAPID_PRIVATE_KEY || '';
        const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
        if (!publicKey || !privateKey) {
          return new NoopPushNotificationService();
        }
        return new PushNotificationService(publicKey, privateKey, subject);
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
    SavePushSubscriptionUseCase,
    RemovePushSubscriptionUseCase,
    ...(isQueueEnabled ? [NotificationProcessor] : []),
  ],
})
export class NotificationModule implements OnModuleInit {
  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    @Optional()
    @Inject(InMemoryNotificationSchedulerService)
    private readonly inMemoryScheduler?: InMemoryNotificationSchedulerService,
  ) {}

  onModuleInit(): void {
    // Wire up the notification handler for the in-memory scheduler
    if (!isQueueEnabled && this.inMemoryScheduler) {
      this.inMemoryScheduler.setNotificationHandler(async (alertId: string) => {
        await this.sendNotificationUseCase.execute(alertId);
      });
    }
  }
}
