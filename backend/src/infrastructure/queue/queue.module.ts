import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationModule } from '@presentation/modules/notification.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    NotificationModule,
  ],
  providers: [NotificationSchedulerService, NotificationProcessor],
  exports: [NotificationSchedulerService, BullModule],
})
export class QueueModule {}

