import { Alert } from '@domain/entities/alert.entity';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

export class InMemoryNotificationSchedulerService implements INotificationScheduler {
  async scheduleNotification(_alert: Alert): Promise<void> {
    return;
  }

  async cancelNotification(_alertId: string): Promise<void> {
    return;
  }
}
