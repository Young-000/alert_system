import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';

const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

/**
 * Queue Module (BullMQ/Redis)
 *
 * Redis + BullMQ 기반 작업 큐. QUEUE_ENABLED=true일 때만 활성화.
 * 현재는 EventBridge Scheduler가 알림 스케줄링을 담당하므로,
 * 이 모듈은 별도로 사용하지 않음. 향후 Redis 기반 큐가 필요할 때 활성화.
 */
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
      : []),
  ],
  exports: [
    ...(isQueueEnabled ? ['INotificationScheduler', BullModule] : []),
  ],
})
export class QueueModule {}
