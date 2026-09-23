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
  /** 영구 실패해 건너뛴 이벤트 수(삭제된 장소 등). 클라이언트는 큐에서 버려도 된다. */
  failed: number;
  results: CommuteEventResponse[];
  failures: BatchEventFailure[];
};

export type BatchEventFailure = {
  placeId: string;
  triggeredAt: string;
  reason: string;
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
