import { Alert } from '@domain/entities/alert.entity';

export interface INotificationScheduler {
  scheduleNotification(alert: Alert): Promise<void>;
  cancelNotification(alertId: string): Promise<void>;
}
