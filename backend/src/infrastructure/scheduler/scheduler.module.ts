import { Module, DynamicModule, Logger } from '@nestjs/common';
import { InMemoryNotificationSchedulerService } from '@infrastructure/queue/in-memory-notification-scheduler.service';
import { EventBridgeSchedulerService } from './eventbridge-scheduler.service';

const logger = new Logger('SchedulerModule');

/**
 * Scheduler Module
 *
 * AWS_SCHEDULER_ENABLED=true: EventBridge Scheduler 사용 (영구 스케줄)
 * AWS_SCHEDULER_ENABLED=false: InMemory 스케줄러 사용 (개발용, 재시작 시 손실)
 *
 * @see infra/terraform/modules/eventbridge/ - AWS 인프라 설정
 */
@Module({})
export class SchedulerModule {
  static forRoot(): DynamicModule {
    const isAWSEnabled = process.env.AWS_SCHEDULER_ENABLED === 'true';

    if (isAWSEnabled) {
      logger.log('🚀 Using EventBridge Scheduler (AWS) - Persistent schedules');
      return {
        module: SchedulerModule,
        providers: [
          {
            provide: 'INotificationScheduler',
            useClass: EventBridgeSchedulerService,
          },
          EventBridgeSchedulerService,
        ],
        exports: ['INotificationScheduler'],
      };
    }

    logger.log('⚠️  Using InMemory Notification Scheduler - Schedules lost on restart');

    return {
      module: SchedulerModule,
      providers: [
        {
          provide: 'INotificationScheduler',
          useClass: InMemoryNotificationSchedulerService,
        },
        InMemoryNotificationSchedulerService,
      ],
      exports: ['INotificationScheduler'],
    };
  }
}
