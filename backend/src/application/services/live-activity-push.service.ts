import { Injectable, Logger } from '@nestjs/common';

/**
 * APNs push-to-update payload for Live Activity.
 * Follows the Apple Push Notification format for Live Activity updates.
 */
export type LiveActivityContentState = {
  optimalDepartureAt: string;
  estimatedTravelMin: number;
  status: string;
  minutesUntilDeparture: number;
  minutesUntilArrival: number | null;
  currentCheckpointIndex: number | null;
  nextCheckpoint: string | null;
  nextTransitInfo: string | null;
  hasTrafficDelay: boolean;
  trafficDelayMessage: string | null;
  estimatedArrivalTime: string | null;
  updatedAt: string;
};

export type LiveActivityPushPayload = {
  aps: {
    timestamp: number;
    event: 'update' | 'end';
    'content-state': LiveActivityContentState;
    'stale-date'?: number;
    'dismissal-date'?: number;
  };
};

export const LIVE_ACTIVITY_PUSH_SERVICE = Symbol('LIVE_ACTIVITY_PUSH_SERVICE');

export interface ILiveActivityPushService {
  /**
   * Send a push-to-update notification to update a Live Activity.
   * @param pushToken - APNs push token for the Live Activity
   * @param payload - The push payload containing content-state
   * @returns true if the push was sent successfully
   */
  sendUpdate(pushToken: string, payload: LiveActivityPushPayload): Promise<boolean>;

  /**
   * Send a push-to-end notification to terminate a Live Activity.
   * @param pushToken - APNs push token for the Live Activity
   * @param contentState - Final content state to display
   * @param dismissalDate - Unix timestamp when the activity should be dismissed
   * @returns true if the push was sent successfully
   */
  sendEnd(
    pushToken: string,
    contentState: LiveActivityContentState,
    dismissalDate?: number,
  ): Promise<boolean>;

  /**
   * Build a content-state payload from departure calculation data.
   */
  buildContentState(params: {
    optimalDepartureAt: Date;
    estimatedTravelMin: number;
    status: string;
    minutesUntilDeparture: number;
    minutesUntilArrival?: number;
    currentCheckpointIndex?: number;
    nextCheckpoint?: string;
    nextTransitInfo?: string;
    hasTrafficDelay: boolean;
    trafficDelayMessage?: string;
    estimatedArrivalTime?: string;
  }): LiveActivityContentState;
}

/**
 * Stub implementation of Live Activity push service.
 * Logs push attempts instead of sending actual APNs notifications.
 *
 * TODO: Replace with real APNs HTTP/2 implementation when .p8 key is configured.
 * Real implementation will use HTTP/2 to api.push.apple.com with JWT authentication.
 */
@Injectable()
export class LiveActivityPushService implements ILiveActivityPushService {
  private readonly logger = new Logger(LiveActivityPushService.name);

  async sendUpdate(
    pushToken: string,
    payload: LiveActivityPushPayload,
  ): Promise<boolean> {
    this.logger.log(
      `[STUB] Would send Live Activity update to token ${pushToken.slice(0, 12)}...: ` +
      `event=${payload.aps.event}, status=${payload.aps['content-state'].status}`,
    );

    // TODO: Implement real APNs HTTP/2 push
    // 1. Load .p8 key from SSM/env
    // 2. Create JWT for APNs authentication
    // 3. Send HTTP/2 POST to https://api.push.apple.com/3/device/{pushToken}
    //    with headers:
    //      apns-push-type: liveactivity
    //      apns-topic: {bundleId}.push-type.liveactivity
    //      apns-priority: 10
    //    and body: JSON.stringify(payload)

    return true;
  }

  async sendEnd(
    pushToken: string,
    contentState: LiveActivityContentState,
    dismissalDate?: number,
  ): Promise<boolean> {
    const payload: LiveActivityPushPayload = {
      aps: {
        timestamp: Math.floor(Date.now() / 1000),
        event: 'end',
        'content-state': contentState,
        ...(dismissalDate ? { 'dismissal-date': dismissalDate } : {}),
      },
    };

    this.logger.log(
      `[STUB] Would send Live Activity end to token ${pushToken.slice(0, 12)}...`,
    );

    return this.sendUpdate(pushToken, payload);
  }

  buildContentState(params: {
    optimalDepartureAt: Date;
    estimatedTravelMin: number;
    status: string;
    minutesUntilDeparture: number;
    minutesUntilArrival?: number;
    currentCheckpointIndex?: number;
    nextCheckpoint?: string;
    nextTransitInfo?: string;
    hasTrafficDelay: boolean;
    trafficDelayMessage?: string;
    estimatedArrivalTime?: string;
  }): LiveActivityContentState {
    return {
      optimalDepartureAt: params.optimalDepartureAt.toISOString(),
      estimatedTravelMin: params.estimatedTravelMin,
      status: params.status,
      minutesUntilDeparture: params.minutesUntilDeparture,
      minutesUntilArrival: params.minutesUntilArrival ?? null,
      currentCheckpointIndex: params.currentCheckpointIndex ?? null,
      nextCheckpoint: params.nextCheckpoint ?? null,
      nextTransitInfo: params.nextTransitInfo ?? null,
      hasTrafficDelay: params.hasTrafficDelay,
      trafficDelayMessage: params.trafficDelayMessage ?? null,
      estimatedArrivalTime: params.estimatedArrivalTime ?? null,
      updatedAt: new Date().toISOString(),
    };
  }
}
