import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import { Alert } from '@domain/entities/alert.entity';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

interface ScheduledJob {
  alertId: string;
  timeout: NodeJS.Timeout;
  nextRun: Date;
}

export type NotificationHandler = (alertId: string) => Promise<void>;

@Injectable()
export class InMemoryNotificationSchedulerService
  implements INotificationScheduler, OnModuleDestroy
{
  private readonly logger = new Logger(InMemoryNotificationSchedulerService.name);
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private notificationHandler: NotificationHandler | null = null;
  private alertCache: Map<string, Alert> = new Map();

  setNotificationHandler(handler: NotificationHandler): void {
    this.notificationHandler = handler;
    this.logger.log('Notification handler registered');
  }

  async scheduleNotification(alert: Alert): Promise<void> {
    if (!alert.enabled) {
      this.logger.debug(`Alert ${alert.id} is disabled, skipping schedule`);
      return;
    }

    // Cancel existing job if any
    await this.cancelNotification(alert.id);

    // Cache the alert for re-scheduling
    this.alertCache.set(alert.id, alert);

    try {
      // Parse cron expression and get next execution time
      const interval = CronExpressionParser.parse(alert.schedule, {
        currentDate: new Date(),
        tz: 'Asia/Seoul',
      });

      const nextRun = interval.next().toDate();
      const delay = nextRun.getTime() - Date.now();

      if (delay <= 0) {
        // If next run is in the past, skip to the next one
        const nextNextRun = interval.next().toDate();
        const nextDelay = nextNextRun.getTime() - Date.now();
        this.scheduleJob(alert.id, nextNextRun, nextDelay);
      } else {
        this.scheduleJob(alert.id, nextRun, delay);
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse cron expression "${alert.schedule}" for alert ${alert.id}`,
        error,
      );
    }
  }

  private scheduleJob(alertId: string, nextRun: Date, delay: number): void {
    // Cap delay to prevent overflow (setTimeout max is ~24.8 days)
    const MAX_DELAY = 2147483647; // ~24.8 days in ms
    const actualDelay = Math.min(delay, MAX_DELAY);

    const timeout = setTimeout(async () => {
      // If we capped the delay, reschedule
      if (delay > MAX_DELAY) {
        const remainingDelay = delay - MAX_DELAY;
        const newNextRun = new Date(Date.now() + remainingDelay);
        this.scheduleJob(alertId, newNextRun, remainingDelay);
        return;
      }

      try {
        // Execute the notification
        if (this.notificationHandler) {
          this.logger.log(`Executing scheduled notification for alert ${alertId}`);
          await this.notificationHandler(alertId);
        } else {
          this.logger.warn(
            `No notification handler registered, cannot send notification for alert ${alertId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to execute notification for alert ${alertId}`,
          error,
        );
      }

      // Re-schedule for next run
      const cachedAlert = this.alertCache.get(alertId);
      if (cachedAlert && cachedAlert.enabled) {
        await this.scheduleNotification(cachedAlert);
      }
    }, actualDelay);

    this.scheduledJobs.set(alertId, {
      alertId,
      timeout,
      nextRun,
    });

    this.logger.log(
      `Scheduled notification for alert ${alertId} at ${nextRun.toISOString()} (in ${Math.round(delay / 1000)}s)`,
    );
  }

  async cancelNotification(alertId: string): Promise<void> {
    const job = this.scheduledJobs.get(alertId);
    if (job) {
      clearTimeout(job.timeout);
      this.scheduledJobs.delete(alertId);
      this.alertCache.delete(alertId);
      this.logger.log(`Cancelled scheduled notification for alert ${alertId}`);
    }
  }

  getScheduledJobs(): Array<{ alertId: string; nextRun: Date }> {
    return Array.from(this.scheduledJobs.values()).map((job) => ({
      alertId: job.alertId,
      nextRun: job.nextRun,
    }));
  }

  onModuleDestroy(): void {
    // Clean up all scheduled jobs
    for (const job of this.scheduledJobs.values()) {
      clearTimeout(job.timeout);
    }
    this.scheduledJobs.clear();
    this.alertCache.clear();
    this.logger.log('All scheduled notifications cleared on module destroy');
  }
}
