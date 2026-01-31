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
import { Public } from '@infrastructure/auth/public.decorator';

interface SchedulerTriggerPayload {
  alertId: string;
  userId: string;
  alertTypes: string[];
}

/**
 * EventBridge Scheduler에서 호출하는 엔드포인트
 * 개인별 알림 스케줄이 실행될 때 이 엔드포인트가 호출됨
 *
 * @Public() - JWT 인증 없이 접근 가능 (자체 시크릿 검증 사용)
 */
@Public()
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
    // 반드시 시크릿이 설정되어 있어야 하며, 일치해야 함
    const expectedSecret = process.env.SCHEDULER_SECRET;
    if (!expectedSecret) {
      this.logger.error('SCHEDULER_SECRET environment variable is not configured');
      throw new UnauthorizedException('Scheduler secret not configured');
    }
    if (schedulerSecret !== expectedSecret) {
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
