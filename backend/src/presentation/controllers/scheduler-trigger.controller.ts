import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';

interface SchedulerTriggerPayload {
  alertId: string;
  userId: string;
  alertTypes: string[];
}

/**
 * EventBridge Scheduler에서 호출하는 엔드포인트
 * 개인별 알림 스케줄이 실행될 때 이 엔드포인트가 호출됨
 */
@Controller('scheduler')
export class SchedulerTriggerController {
  private readonly logger = new Logger(SchedulerTriggerController.name);

  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  /**
   * EventBridge Scheduler에서 호출하는 알림 트리거
   *
   * POST /scheduler/trigger
   * Body: { alertId, userId, alertTypes }
   * Header: x-scheduler-secret (검증용)
   */
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerNotification(
    @Body() payload: SchedulerTriggerPayload,
    @Headers('x-scheduler-secret') schedulerSecret: string,
  ): Promise<{ success: boolean; message: string }> {
    // 스케줄러 시크릿 검증 (EventBridge에서 설정한 헤더)
    const expectedSecret = process.env.SCHEDULER_SECRET;
    if (expectedSecret && schedulerSecret !== expectedSecret) {
      this.logger.warn(`Invalid scheduler secret for alert ${payload.alertId}`);
      throw new UnauthorizedException('Invalid scheduler secret');
    }

    this.logger.log(
      `Received scheduler trigger for alert ${payload.alertId}, user ${payload.userId}`,
    );

    try {
      // 알림 발송 (기존 SendNotificationUseCase 사용)
      await this.sendNotificationUseCase.execute(payload.alertId);

      this.logger.log(`Successfully sent notification for alert ${payload.alertId}`);

      return {
        success: true,
        message: `Notification sent for alert ${payload.alertId}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send notification for alert ${payload.alertId}`,
        error,
      );

      // 에러를 던져서 EventBridge가 재시도하도록 함
      throw error;
    }
  }

  /**
   * 헬스체크 엔드포인트 (EventBridge Target 검증용)
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
