import { Controller, Post, Body, HttpCode, HttpStatus, Headers, UnauthorizedException } from '@nestjs/common';
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
 * @deprecated AWS 전환 후 제거 예정
 */
@Controller('scheduler-legacy')
export class SchedulerLegacyController {
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
    // 간단한 API 키 검증
    const expectedKey = process.env.SCHEDULER_API_KEY || 'scheduler-secret-key';
    if (schedulerKey !== expectedKey) {
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
        console.error(`Failed to send alert ${dto.alertId}:`, error);
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
          console.error(`Failed to send alert ${alert.id}:`, error);
          errors++;
        }
      }
    }

    return { processed, errors };
  }
}
