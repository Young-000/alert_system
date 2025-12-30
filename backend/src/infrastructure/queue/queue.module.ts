import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';

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
  ],
  providers: [NotificationSchedulerService],
  exports: [NotificationSchedulerService, BullModule],
})
export class QueueModule {}

