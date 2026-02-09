import { ApiClient } from '../api/api-client';

export enum BehaviorEventType {
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  DEPARTURE_CONFIRMED = 'departure_confirmed',
  TRANSIT_INFO_VIEWED = 'transit_info_viewed',
  ALERT_CREATED = 'alert_created',
  ALERT_MODIFIED = 'alert_modified',
}

interface TrackEventOptions {
  alertId?: string;
  metadata?: Record<string, unknown>;
  source?: 'push' | 'app';
}

interface TrackDepartureOptions {
  alertId: string;
  source: 'push' | 'app';
  weatherCondition?: string;
  transitDelayMinutes?: number;
}

class BehaviorCollector {
  private userId: string | null = null;
  private trackingEnabled = true;
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * Initialize the collector with user ID
   */
  initialize(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set tracking enabled/disabled (for privacy settings)
   */
  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  /**
   * Check if tracking is available
   */
  isAvailable(): boolean {
    return this.trackingEnabled && this.userId !== null;
  }

  /**
   * Track a generic behavior event
   */
  async trackEvent(
    eventType: BehaviorEventType,
    options?: TrackEventOptions
  ): Promise<void> {
    if (!this.isAvailable()) {
      // Behavior tracking disabled or user not initialized
      return;
    }

    try {
      await this.apiClient.post('/behavior/track', {
        userId: this.userId,
        eventType,
        alertId: options?.alertId,
        metadata: options?.metadata,
        source: options?.source || 'app',
      });
    } catch {
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Track departure confirmation ("지금 출발" button click)
   */
  async trackDepartureConfirmed(options: TrackDepartureOptions): Promise<void> {
    if (!this.isAvailable()) {
      // Behavior tracking disabled or user not initialized
      return;
    }

    try {
      await this.apiClient.post('/behavior/departure-confirmed', {
        userId: this.userId,
        alertId: options.alertId,
        source: options.source,
        weatherCondition: options.weatherCondition,
        transitDelayMinutes: options.transitDelayMinutes,
      });
    } catch {
      // Tracking failures are non-critical
    }
  }

  /**
   * Track notification opened
   */
  async trackNotificationOpened(
    alertId: string,
    notificationId?: string
  ): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.apiClient.post('/behavior/notification-opened', {
        userId: this.userId,
        alertId,
        notificationId,
      });
    } catch {
      // Silent: analytics tracking failure is non-critical
    }
  }

  /**
   * Track transit info viewed (user checked bus/subway times)
   */
  async trackTransitInfoViewed(alertId?: string): Promise<void> {
    await this.trackEvent(BehaviorEventType.TRANSIT_INFO_VIEWED, {
      alertId,
      source: 'app',
    });
  }
}

// Singleton instance
export const behaviorCollector = new BehaviorCollector();

// Export types
export type { TrackEventOptions, TrackDepartureOptions };
