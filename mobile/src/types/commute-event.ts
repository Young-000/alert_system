// ─── Commute Event Types (Geofence event recording) ──────────────

export type CommuteEventType = 'enter' | 'exit';

export type CommuteAction =
  | 'commute_started'
  | 'commute_completed'
  | 'return_started'
  | 'return_completed'
  | 'ignored';

export type RecordCommuteEventDto = {
  placeId: string;
  eventType: CommuteEventType;
  triggeredAt: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
};

export type CommuteEventResponse = {
  id: string;
  userId: string;
  placeId: string;
  placeType: 'home' | 'work';
  eventType: CommuteEventType;
  triggeredAt: string;
  sessionId?: string;
  action?: CommuteAction;
};

export type BatchCommuteEventsDto = {
  events: RecordCommuteEventDto[];
};

export type BatchCommuteEventsResponse = {
  processed: number;
  ignored: number;
  results: CommuteEventResponse[];
};

export type CommuteEvent = {
  id: string;
  userId: string;
  placeId: string;
  eventType: CommuteEventType;
  triggeredAt: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  sessionId?: string;
  source: 'geofence' | 'manual';
  isProcessed: boolean;
  createdAt: string;
};
