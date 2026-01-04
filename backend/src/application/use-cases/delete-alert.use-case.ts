import { Inject } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

export class DeleteAlertUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('INotificationScheduler')
    private notificationScheduler: INotificationScheduler
  ) {}

  async execute(alertId: string): Promise<void> {
    await this.alertRepository.delete(alertId);
    await this.notificationScheduler.cancelNotification(alertId);
  }
}
