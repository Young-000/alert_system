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
    await this.alertRepository.delete(alertId);
    await this.notificationScheduler.cancelNotification(alertId);
  }
}
