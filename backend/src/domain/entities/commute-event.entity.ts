export type CommuteEventType = 'enter' | 'exit';
export type CommuteEventSource = 'geofence' | 'manual';
export type CommuteEventAction =
  | 'commute_started'
  | 'commute_completed'
  | 'return_started'
  | 'return_completed'
  | 'ignored';

export class CommuteEvent {
  readonly id: string;
  readonly userId: string;
  readonly placeId: string;
  readonly eventType: CommuteEventType;
  readonly triggeredAt: Date;
  readonly recordedAt: Date;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly accuracyM?: number;
  readonly sessionId?: string;
  readonly source: CommuteEventSource;
  readonly isProcessed: boolean;
  readonly createdAt: Date;

  constructor(
    userId: string,
    placeId: string,
    eventType: CommuteEventType,
    triggeredAt: Date,
    options?: {
      id?: string;
      recordedAt?: Date;
      latitude?: number;
      longitude?: number;
      accuracyM?: number;
      sessionId?: string;
      source?: CommuteEventSource;
      isProcessed?: boolean;
      createdAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.placeId = placeId;
    this.eventType = eventType;
    this.triggeredAt = triggeredAt;
    this.recordedAt = options?.recordedAt || new Date();
    this.latitude = options?.latitude;
    this.longitude = options?.longitude;
    this.accuracyM = options?.accuracyM;
    this.sessionId = options?.sessionId;
    this.source = options?.source || 'geofence';
    this.isProcessed = options?.isProcessed ?? false;
    this.createdAt = options?.createdAt || new Date();
  }

  static fromGeofence(
    userId: string,
    placeId: string,
    eventType: CommuteEventType,
    triggeredAt: Date,
    coords?: { latitude?: number; longitude?: number; accuracyM?: number }
  ): CommuteEvent {
    return new CommuteEvent(userId, placeId, eventType, triggeredAt, {
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracyM: coords?.accuracyM,
      source: 'geofence',
      isProcessed: false,
    });
  }

  withSessionId(sessionId: string): CommuteEvent {
    return new CommuteEvent(this.userId, this.placeId, this.eventType, this.triggeredAt, {
      id: this.id,
      recordedAt: this.recordedAt,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracyM: this.accuracyM,
      sessionId,
      source: this.source,
      isProcessed: this.isProcessed,
      createdAt: this.createdAt,
    });
  }

  markProcessed(): CommuteEvent {
    return new CommuteEvent(this.userId, this.placeId, this.eventType, this.triggeredAt, {
      id: this.id,
      recordedAt: this.recordedAt,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracyM: this.accuracyM,
      sessionId: this.sessionId,
      source: this.source,
      isProcessed: true,
      createdAt: this.createdAt,
    });
  }
}
