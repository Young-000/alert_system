import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { InMemoryNotificationSchedulerService } from './in-memory-notification-scheduler.service';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

@Module({
  imports: [
    ...(isQueueEnabled
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
          }),
          BullModule.registerQueue({
            name: 'notifications',
          }),
        ]
      : []),
  ],
  providers: [
    ...(isQueueEnabled
      ? [
          {
            provide: 'IAlertRepository',
            useClass: PostgresAlertRepository,
          },
          NotificationSchedulerService,
          {
            provide: 'INotificationScheduler',
            useExisting: NotificationSchedulerService,
          },
        ]
      : [
          InMemoryNotificationSchedulerService,
          {
            provide: 'INotificationScheduler',
            useExisting: InMemoryNotificationSchedulerService,
          },
        ]),
  ],
  exports: [
    'INotificationScheduler',
    ...(isQueueEnabled ? [BullModule] : [InMemoryNotificationSchedulerService]),
  ],
})
export class QueueModule {}
