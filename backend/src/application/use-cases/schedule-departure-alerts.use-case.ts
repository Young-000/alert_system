import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  FlexibleTimeWindowMode,
  ScheduleState,
  ActionAfterCompletion,
} from '@aws-sdk/client-scheduler';
import {
  ISmartDepartureSnapshotRepository,
  SMART_DEPARTURE_SNAPSHOT_REPOSITORY,
} from '@domain/repositories/smart-departure-snapshot.repository';
import type { SmartDepartureSnapshot } from '@domain/entities/smart-departure-snapshot.entity';
import type { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';

interface SchedulerConfig {
  scheduleGroupName: string;
  schedulerRoleArn: string;
  eventBusArn: string;
  dlqArn: string;
  eventSource: string;
}

@Injectable()
export class ScheduleDepartureAlertsUseCase {
  private readonly logger = new Logger(ScheduleDepartureAlertsUseCase.name);
  private readonly client: SchedulerClient;
  private readonly config: SchedulerConfig;
  private readonly isConfigured: boolean;

  constructor(
    @Inject(SMART_DEPARTURE_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepo: ISmartDepartureSnapshotRepository,
  ) {
    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const accountId = process.env.AWS_ACCOUNT_ID;

    this.client = new SchedulerClient({ region });

    this.config = {
      scheduleGroupName:
        process.env.SCHEDULE_GROUP_NAME || 'alert-system-prod-alerts',
      schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN || '',
      eventBusArn: accountId
        ? `arn:aws:events:${region}:${accountId}:event-bus/default`
        : '',
      dlqArn: process.env.SCHEDULER_DLQ_ARN || '',
      eventSource: 'alert-system.smart-departure',
    };

    this.isConfigured = !!this.config.schedulerRoleArn && !!accountId;
    if (!this.isConfigured) {
      this.logger.warn(
        'EventBridge Scheduler configuration incomplete for smart departure. Schedules will not be created.',
      );
    }
  }

  /**
   * Create EventBridge one-time schedules for pre-alerts.
   * Each pre-alert (e.g., 30min, 10min, 0min before departure) gets its own schedule.
   */
  async scheduleAlerts(
    snapshot: SmartDepartureSnapshot,
    setting: SmartDepartureSetting,
  ): Promise<string[]> {
    if (!this.isConfigured) {
      this.logger.debug('Scheduler not configured, skipping alert scheduling');
      return [];
    }

    const scheduleIds: string[] = [];

    for (const preAlertMin of setting.preAlerts) {
      try {
        const scheduleId = await this.createOneTimeSchedule(
          snapshot,
          preAlertMin,
        );
        if (scheduleId) {
          scheduleIds.push(scheduleId);
        }
      } catch (error) {
        this.logger.error(
          `Failed to create schedule for snapshot ${snapshot.id}, preAlert ${preAlertMin}min: ${error}`,
        );
      }
    }

    // Update snapshot with schedule IDs
    if (scheduleIds.length > 0) {
      const updated = snapshot.withScheduleIds(scheduleIds);
      await this.snapshotRepo.update(updated);
    }

    return scheduleIds;
  }

  /**
   * Cancel all scheduled alerts for a snapshot.
   */
  async cancelAlerts(scheduleIds: string[]): Promise<void> {
    if (!this.isConfigured) return;

    for (const scheduleId of scheduleIds) {
      try {
        await this.deleteSchedule(scheduleId);
      } catch (error) {
        this.logger.error(
          `Failed to delete schedule ${scheduleId}: ${error}`,
        );
      }
    }
  }

  /**
   * Reschedule alerts when departure time changes.
   * Deletes old schedules and creates new ones.
   */
  async rescheduleAlerts(
    snapshot: SmartDepartureSnapshot,
    setting: SmartDepartureSetting,
  ): Promise<string[]> {
    // Cancel existing schedules
    if (snapshot.scheduleIds.length > 0) {
      await this.cancelAlerts(snapshot.scheduleIds);
    }

    // Create new schedules
    return this.scheduleAlerts(snapshot, setting);
  }

  private async createOneTimeSchedule(
    snapshot: SmartDepartureSnapshot,
    preAlertMinutes: number,
  ): Promise<string | null> {
    const alertTime = new Date(
      snapshot.optimalDepartureAt.getTime() - preAlertMinutes * 60_000,
    );

    // Don't schedule if the time has already passed
    if (alertTime <= new Date()) {
      this.logger.debug(
        `Skipping schedule for snapshot ${snapshot.id}, preAlert ${preAlertMinutes}min: time has passed`,
      );
      return null;
    }

    const scheduleName = this.getScheduleName(snapshot.id, preAlertMinutes);

    const eventPayload = JSON.stringify({
      type: 'smart-departure-alert',
      snapshotId: snapshot.id,
      userId: snapshot.userId,
      departureType: snapshot.departureType,
      preAlertMinutes,
      optimalDepartureAt: snapshot.optimalDepartureAt.toISOString(),
      arrivalTarget: snapshot.arrivalTarget,
      estimatedTravelMin: snapshot.estimatedTravelMin,
    });

    // Format as EventBridge at() expression: at(yyyy-mm-ddThh:mm:ss)
    const atExpression = `at(${alertTime.toISOString().replace(/\.\d{3}Z$/, '')})`;

    const command = new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: this.config.scheduleGroupName,
      ScheduleExpression: atExpression,
      ScheduleExpressionTimezone: 'UTC',
      State: ScheduleState.ENABLED,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      ActionAfterCompletion: ActionAfterCompletion.DELETE,
      Target: {
        Arn: this.config.eventBusArn,
        RoleArn: this.config.schedulerRoleArn,
        EventBridgeParameters: {
          DetailType: 'SmartDepartureAlert',
          Source: this.config.eventSource,
        },
        Input: eventPayload,
        RetryPolicy: {
          MaximumRetryAttempts: 2,
          MaximumEventAgeInSeconds: 1800, // 30 minutes
        },
        DeadLetterConfig: this.config.dlqArn
          ? { Arn: this.config.dlqArn }
          : undefined,
      },
      Description: `Smart departure pre-alert: ${preAlertMinutes}min before departure for user ${snapshot.userId}`,
    });

    await this.client.send(command);
    this.logger.debug(
      `Created one-time schedule ${scheduleName} at ${alertTime.toISOString()}`,
    );

    return scheduleName;
  }

  private async deleteSchedule(scheduleName: string): Promise<void> {
    try {
      const command = new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: this.config.scheduleGroupName,
      });
      await this.client.send(command);
      this.logger.debug(`Deleted schedule ${scheduleName}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        this.logger.debug(`Schedule ${scheduleName} not found, nothing to delete`);
        return;
      }
      throw error;
    }
  }

  private getScheduleName(snapshotId: string, preAlertMinutes: number): string {
    return `dep-${snapshotId.slice(0, 8)}-${preAlertMinutes}m`;
  }
}
