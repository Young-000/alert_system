import { Module, DynamicModule, Logger } from '@nestjs/common';
import { EventBridgeSchedulerService } from './eventbridge-scheduler.service';

const logger = new Logger('SchedulerModule');

/**
 * Scheduler Module
 *
 * AWS EventBridge Scheduler를 사용하여 영구 스케줄을 관리합니다.
 *
 * @see infra/terraform/modules/eventbridge/ - AWS 인프라 설정
 */
@Module({})
export class SchedulerModule {
  static forRoot(): DynamicModule {
    logger.log('Using EventBridge Scheduler (AWS) - Persistent schedules');
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
}
