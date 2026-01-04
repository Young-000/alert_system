import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Alert } from '@domain/entities/alert.entity';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

export class NotificationSchedulerService implements INotificationScheduler {
  constructor(
    @InjectQueue('notifications') private queue: Queue,
    @Inject('IAlertRepository') private alertRepository: IAlertRepository
  ) {}

  async scheduleNotification(alert: Alert): Promise<void> {
    if (!alert.enabled) {
      return;
    }

    await this.queue.add(
      'send-notification',
      { alertId: alert.id },
      {
        repeat: {
          pattern: alert.schedule,
        },
        jobId: `alert-${alert.id}`,
      }
    );
  }

  async cancelNotification(alertId: string): Promise<void> {
    const jobs = await this.queue.getRepeatableJobs();
    const job = jobs.find((j) => j.id === `alert-${alertId}`);
    if (job) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }

  async scheduleAllAlerts(userId: string): Promise<void> {
    const alerts = await this.alertRepository.findByUserId(userId);
    for (const alert of alerts) {
      if (alert.enabled) {
        await this.scheduleNotification(alert);
      }
    }
  }
}
