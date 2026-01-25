import { Module, DynamicModule, Logger } from '@nestjs/common';
import { InMemoryNotificationSchedulerService } from '@infrastructure/queue/in-memory-notification-scheduler.service';

const logger = new Logger('SchedulerModule');

/**
 * Scheduler Module
 *
 * 현재: InMemory 스케줄러 사용 (개발/Render 배포용)
 *
 * AWS 전환 시:
 * 1. AWS SDK 설치: npm install @aws-sdk/client-scheduler @aws-sdk/client-sqs
 * 2. .aws-ready/eventbridge-scheduler.service.ts를 이 폴더로 이동
 * 3. AWS_SCHEDULER_ENABLED=true 환경변수 설정
 * 4. 아래 forRoot() 메서드의 AWS 관련 코드 주석 해제
 *
 * @see infra/DEPLOYMENT_GUIDE.md 참조
 */
@Module({})
export class SchedulerModule {
  static forRoot(): DynamicModule {
    const isAWSEnabled = process.env.AWS_SCHEDULER_ENABLED === 'true';

    if (isAWSEnabled) {
      // AWS 전환 시 아래 코드 주석 해제:
      // try {
      //   const { EventBridgeSchedulerService } = require('./eventbridge-scheduler.service');
      //   logger.log('Using EventBridge Scheduler (AWS)');
      //   return {
      //     module: SchedulerModule,
      //     providers: [
      //       { provide: 'INotificationScheduler', useClass: EventBridgeSchedulerService },
      //       EventBridgeSchedulerService,
      //     ],
      //     exports: ['INotificationScheduler'],
      //   };
      // } catch {
      //   logger.warn('AWS SDK not installed, falling back to InMemory');
      // }
      logger.warn(
        'AWS_SCHEDULER_ENABLED=true but EventBridge is not yet configured. ' +
          'Using InMemory scheduler. See .aws-ready/ folder for AWS setup.',
      );
    }

    logger.log('Using InMemory Notification Scheduler');

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
