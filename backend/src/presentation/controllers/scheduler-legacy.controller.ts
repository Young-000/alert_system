import { Controller, Post, Body, HttpCode, HttpStatus, Headers, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Inject } from '@nestjs/common';

interface TriggerDto {
  type: 'morning' | 'evening' | 'custom';
  alertId?: string;
}

/**
 * Legacy Scheduler Controller
 *
 * Render 배포용 크론 트리거 (모든 알림 일괄 발송)
 * AWS 전환 후에는 scheduler-trigger.controller.ts 사용
 *
 * @deprecated AWS EventBridge로 전환 완료. 프로덕션에서 비활성화됨.
 */
@Controller('scheduler-legacy')
export class SchedulerLegacyController {
  private readonly logger = new Logger(SchedulerLegacyController.name);

  constructor(
    private sendNotificationUseCase: SendNotificationUseCase,
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
  ) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerNotifications(
    @Body() dto: TriggerDto,
    @Headers('x-scheduler-key') schedulerKey: string,
  ): Promise<{ processed: number; errors: number }> {
    // 프로덕션에서는 EventBridge 사용 → legacy 엔드포인트 비활성화
    if (process.env.AWS_SCHEDULER_ENABLED === 'true') {
      throw new ForbiddenException('Legacy scheduler is disabled. Use EventBridge Scheduler.');
    }

    // API 키 검증 (timing-safe comparison으로 타이밍 공격 방지)
    const expectedKey = process.env.SCHEDULER_API_KEY;
    if (!expectedKey || !schedulerKey) {
      this.logger.error('SCHEDULER_API_KEY environment variable is not set or key header is missing');
      throw new UnauthorizedException('Scheduler not configured');
    }
    const expected = Buffer.from(expectedKey, 'utf8');
    const received = Buffer.from(schedulerKey, 'utf8');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Invalid scheduler key');
    }

    let processed = 0;
    let errors = 0;

    if (dto.alertId) {
      // 특정 알림만 발송
      try {
        await this.sendNotificationUseCase.execute(dto.alertId);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to send alert ${dto.alertId}:`, error instanceof Error ? error.stack : String(error));
        errors++;
      }
    } else {
      // 모든 활성 알림 발송 (시간대 기반 필터링 가능)
      const alerts = await this.alertRepository.findAll();
      const enabledAlerts = alerts.filter(a => a.enabled);

      for (const alert of enabledAlerts) {
        try {
          await this.sendNotificationUseCase.execute(alert.id);
          processed++;
        } catch (error) {
          this.logger.error(`Failed to send alert ${alert.id}:`, error instanceof Error ? error.stack : String(error));
          errors++;
        }
      }
    }

    return { processed, errors };
  }
}
