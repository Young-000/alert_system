import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { DataSource } from 'typeorm';
import { InMemoryNotificationSchedulerService } from './in-memory-notification-scheduler.service';

@Module({
  imports: [
    ...(process.env.QUEUE_ENABLED === 'true'
      ? [
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
        ]
      : []),
  ],
  providers: [
    ...(process.env.QUEUE_ENABLED === 'true'
      ? [
          {
            provide: 'IAlertRepository',
            useFactory: (dataSource: DataSource) => {
              return new PostgresAlertRepository(dataSource);
            },
            inject: [DataSource],
          },
          NotificationSchedulerService,
          {
            provide: 'INotificationScheduler',
            useExisting: NotificationSchedulerService,
          },
        ]
      : [
          {
            provide: 'INotificationScheduler',
            useClass: InMemoryNotificationSchedulerService,
          },
        ]),
  ],
  exports: [
    'INotificationScheduler',
    ...(process.env.QUEUE_ENABLED === 'true' ? [BullModule] : []),
  ],
})
export class QueueModule {}
