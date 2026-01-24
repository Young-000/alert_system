export enum BehaviorEventType {
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  DEPARTURE_CONFIRMED = 'departure_confirmed',
  TRANSIT_INFO_VIEWED = 'transit_info_viewed',
  ALERT_CREATED = 'alert_created',
  ALERT_MODIFIED = 'alert_modified',
}

export interface BehaviorEventMetadata {
  alertId?: string;
  alertName?: string;
  notificationId?: string;
  actionType?: string;
  deviceType?: string;
  source?: 'push' | 'app';
  [key: string]: unknown;
}

export class BehaviorEvent {
  readonly id: string;
  readonly userId: string;
  readonly alertId?: string;
  readonly eventType: BehaviorEventType;
  readonly timestamp: Date;
  readonly dayOfWeek: number;
  readonly isWeekday: boolean;
  readonly metadata: BehaviorEventMetadata;
  readonly createdAt: Date;

  constructor(
    userId: string,
    eventType: BehaviorEventType,
    options?: {
      id?: string;
      alertId?: string;
      timestamp?: Date;
      metadata?: BehaviorEventMetadata;
    }
  ) {
    const now = options?.timestamp || new Date();
    const dayOfWeek = now.getDay();

    this.id = options?.id || '';
    this.userId = userId;
    this.alertId = options?.alertId;
    this.eventType = eventType;
    this.timestamp = now;
    this.dayOfWeek = dayOfWeek;
    this.isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    this.metadata = options?.metadata || {};
    this.createdAt = new Date();
  }

  static createDepartureConfirmed(
    userId: string,
    alertId: string,
    source: 'push' | 'app'
  ): BehaviorEvent {
    return new BehaviorEvent(userId, BehaviorEventType.DEPARTURE_CONFIRMED, {
      alertId,
      metadata: { source, alertId },
    });
  }

  static createNotificationOpened(
    userId: string,
    alertId: string,
    notificationId: string
  ): BehaviorEvent {
    return new BehaviorEvent(userId, BehaviorEventType.NOTIFICATION_OPENED, {
      alertId,
      metadata: { notificationId, alertId },
    });
  }
}
