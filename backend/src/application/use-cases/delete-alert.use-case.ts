import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

@Injectable()
export class DeleteAlertUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('INotificationScheduler')
    private notificationScheduler: INotificationScheduler
  ) {}

  async execute(alertId: string): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    // 스케줄을 먼저 취소한다. 순서를 뒤집으면 취소가 실패했을 때 DB 행은 이미 사라지고
    // EventBridge 스케줄만 남아, 목록에 없는 알림이 계속 발송되는데 되돌릴 근거가 없다.
    // 이미 없는 스케줄은 ResourceNotFoundException을 삼키므로 이 순서가 삭제를 막지 않는다.
    await this.notificationScheduler.cancelNotification(alertId);
    await this.alertRepository.delete(alertId);
  }
}
