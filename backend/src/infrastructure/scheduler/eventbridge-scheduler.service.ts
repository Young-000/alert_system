import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  UpdateScheduleCommand,
  FlexibleTimeWindowMode,
  ScheduleState,
  ActionAfterCompletion,
} from '@aws-sdk/client-scheduler';
import { Alert } from '@domain/entities/alert.entity';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

interface ScheduleConfig {
  scheduleGroupName: string;
  schedulerRoleArn: string;
  eventBusArn: string;
  dlqArn: string;
  eventSource: string;
}

/**
 * AWS EventBridge Scheduler를 사용한 알림 스케줄러
 *
 * 서버 재시작과 무관하게 AWS가 스케줄을 영구 관리합니다.
 * 스케줄 실행 시 API Destination을 통해 /scheduler/trigger 엔드포인트를 호출합니다.
 */
@Injectable()
export class EventBridgeSchedulerService implements INotificationScheduler, OnModuleInit {
  private readonly logger = new Logger(EventBridgeSchedulerService.name);
  private readonly client: SchedulerClient;
  private readonly config: ScheduleConfig;
  private isConfigured = false;

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const accountId = process.env.AWS_ACCOUNT_ID;
    if (!accountId) {
      throw new Error(
        'AWS_ACCOUNT_ID environment variable is required but not set',
      );
    }

    this.client = new SchedulerClient({ region });

    this.config = {
      scheduleGroupName: process.env.SCHEDULE_GROUP_NAME || 'alert-system-prod-alerts',
      schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN || '',
      // Use default event bus instead of API Destination
      eventBusArn: `arn:aws:events:${region}:${accountId}:event-bus/default`,
      dlqArn: process.env.SCHEDULER_DLQ_ARN || '',
      eventSource: 'alert-system.scheduler',
    };
  }

  onModuleInit() {
    // 설정 검증
    if (!this.config.schedulerRoleArn) {
      this.logger.warn(
        'EventBridge Scheduler configuration incomplete. ' +
        'Required: SCHEDULER_ROLE_ARN. ' +
        'Schedules will not be created.',
      );
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      this.logger.log(
        `EventBridge Scheduler configured with group: ${this.config.scheduleGroupName}`,
      );
      this.logger.log(`Event Bus: ${this.config.eventBusArn}`);
    }
  }

  /**
   * 알림 스케줄 생성/업데이트
   * Cron 표현식을 EventBridge 형식으로 변환하여 등록
   */
  async scheduleNotification(alert: Alert): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Scheduler not configured, skipping schedule for alert ${alert.id}`);
      return;
    }

    if (!alert.enabled) {
      this.logger.debug(`Alert ${alert.id} is disabled, skipping schedule`);
      await this.cancelNotification(alert.id);
      return;
    }

    const scheduleName = this.getScheduleName(alert.id);
    const cronExpression = this.convertToEventBridgeCron(alert.schedule);

    try {
      // 기존 스케줄이 있는지 확인
      const existingSchedule = await this.getSchedule(scheduleName);

      if (existingSchedule) {
        // 업데이트
        await this.updateSchedule(alert, cronExpression);
      } else {
        // 새로 생성
        await this.createSchedule(alert, cronExpression);
      }

      this.logger.log(`Scheduled notification for alert ${alert.id} with cron: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Failed to schedule notification for alert ${alert.id}`, error);
      throw error;
    }
  }

  /**
   * 스케줄 생성 - EventBridge Event Bus 사용
   * Scheduler → Event Bus → Rule → API Destination
   */
  private async createSchedule(alert: Alert, cronExpression: string): Promise<void> {
    // EventBridge event format
    const eventPayload = JSON.stringify({
      alertId: alert.id,
      userId: alert.userId,
      alertTypes: alert.alertTypes,
    });

    const command = new CreateScheduleCommand({
      Name: this.getScheduleName(alert.id),
      GroupName: this.config.scheduleGroupName,
      ScheduleExpression: cronExpression,
      ScheduleExpressionTimezone: 'Asia/Seoul',
      State: ScheduleState.ENABLED,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      ActionAfterCompletion: ActionAfterCompletion.NONE, // 반복 스케줄
      Target: {
        Arn: this.config.eventBusArn,
        RoleArn: this.config.schedulerRoleArn,
        // EventBridge target requires EventBridgeParameters
        EventBridgeParameters: {
          DetailType: 'ScheduledNotification',
          Source: this.config.eventSource,
        },
        Input: eventPayload,
        RetryPolicy: {
          MaximumRetryAttempts: 3,
          MaximumEventAgeInSeconds: 3600, // 1시간
        },
        DeadLetterConfig: this.config.dlqArn
          ? { Arn: this.config.dlqArn }
          : undefined,
      },
      Description: `Alert notification for user ${alert.userId} - ${alert.name}`,
    });

    await this.client.send(command);
    this.logger.debug(`Created schedule ${this.getScheduleName(alert.id)}`);
  }

  /**
   * 스케줄 업데이트
   */
  private async updateSchedule(alert: Alert, cronExpression: string): Promise<void> {
    const eventPayload = JSON.stringify({
      alertId: alert.id,
      userId: alert.userId,
      alertTypes: alert.alertTypes,
    });

    const command = new UpdateScheduleCommand({
      Name: this.getScheduleName(alert.id),
      GroupName: this.config.scheduleGroupName,
      ScheduleExpression: cronExpression,
      ScheduleExpressionTimezone: 'Asia/Seoul',
      State: alert.enabled ? ScheduleState.ENABLED : ScheduleState.DISABLED,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      ActionAfterCompletion: ActionAfterCompletion.NONE,
      Target: {
        Arn: this.config.eventBusArn,
        RoleArn: this.config.schedulerRoleArn,
        EventBridgeParameters: {
          DetailType: 'ScheduledNotification',
          Source: this.config.eventSource,
        },
        Input: eventPayload,
        RetryPolicy: {
          MaximumRetryAttempts: 3,
          MaximumEventAgeInSeconds: 3600,
        },
        DeadLetterConfig: this.config.dlqArn
          ? { Arn: this.config.dlqArn }
          : undefined,
      },
    });

    await this.client.send(command);
    this.logger.debug(`Updated schedule ${this.getScheduleName(alert.id)}`);
  }

  /**
   * 스케줄 삭제
   */
  async cancelNotification(alertId: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`Scheduler not configured, skipping cancel for alert ${alertId}`);
      return;
    }

    const scheduleName = this.getScheduleName(alertId);

    try {
      const command = new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: this.config.scheduleGroupName,
      });

      await this.client.send(command);
      this.logger.log(`Cancelled notification schedule for alert ${alertId}`);
    } catch (error: unknown) {
      // 스케줄이 없으면 무시
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        this.logger.debug(`Schedule for alert ${alertId} not found, nothing to cancel`);
        return;
      }
      throw error;
    }
  }

  /**
   * 스케줄 조회
   */
  private async getSchedule(scheduleName: string): Promise<boolean> {
    try {
      const command = new GetScheduleCommand({
        Name: scheduleName,
        GroupName: this.config.scheduleGroupName,
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 스케줄 이름 생성
   */
  private getScheduleName(alertId: string): string {
    return `alert-${alertId}`;
  }

  /**
   * 일반 Cron 표현식을 EventBridge Cron 형식으로 변환
   *
   * 입력: "0 8 * * 1-5" (분 시 일 월 요일) - 표준 5필드 cron
   * 출력: "cron(0 8 ? * MON-FRI *)" - EventBridge 6필드 cron
   */
  private convertToEventBridgeCron(schedule: string): string {
    const parts = schedule.trim().split(/\s+/);

    if (parts.length === 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // 요일 변환 (0-6 → SUN-SAT 또는 1-5 → MON-FRI)
      const convertedDayOfWeek = this.convertDayOfWeek(dayOfWeek);

      // EventBridge는 dayOfMonth와 dayOfWeek 중 하나만 지정 가능
      // dayOfWeek이 *가 아니면 dayOfMonth를 ?로
      const finalDayOfMonth = convertedDayOfWeek !== '?' ? '?' : dayOfMonth;

      return `cron(${minute} ${hour} ${finalDayOfMonth} ${month} ${convertedDayOfWeek} *)`;
    }

    // 이미 EventBridge 형식이면 그대로 반환
    if (schedule.startsWith('cron(') || schedule.startsWith('rate(')) {
      return schedule;
    }

    // 시간 형식 (HH:mm)이면 매일 해당 시간으로 변환
    const timeMatch = schedule.match(/^(\d{2}):(\d{2})$/);
    if (timeMatch) {
      return `cron(${timeMatch[2]} ${timeMatch[1]} ? * * *)`;
    }

    throw new Error(`Invalid schedule format: ${schedule}`);
  }

  /**
   * 요일 형식 변환
   */
  private convertDayOfWeek(dayOfWeek: string): string {
    if (dayOfWeek === '*') {
      return '?';
    }

    // 범위 변환 (1-5 → MON-FRI)
    const dayMap: Record<string, string> = {
      '0': 'SUN',
      '1': 'MON',
      '2': 'TUE',
      '3': 'WED',
      '4': 'THU',
      '5': 'FRI',
      '6': 'SAT',
      '7': 'SUN',
    };

    // 범위 처리 (예: 1-5)
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-');
      return `${dayMap[start] || start}-${dayMap[end] || end}`;
    }

    // 목록 처리 (예: 1,3,5)
    if (dayOfWeek.includes(',')) {
      return dayOfWeek
        .split(',')
        .map((d) => dayMap[d] || d)
        .join(',');
    }

    return dayMap[dayOfWeek] || dayOfWeek;
  }
}
