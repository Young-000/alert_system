// Mock behavior collector for Vitest
export enum BehaviorEventType {
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  DEPARTURE_CONFIRMED = 'departure_confirmed',
  TRANSIT_INFO_VIEWED = 'transit_info_viewed',
  ALERT_CREATED = 'alert_created',
  ALERT_MODIFIED = 'alert_modified',
  ALERT_DELETED = 'alert_deleted',
  ROUTE_CREATED = 'route_created',
  SESSION_STARTED = 'session_started',
  SESSION_COMPLETED = 'session_completed',
}

export const behaviorCollector = {
  track: vi.fn(),
  flush: vi.fn(),
  setUserId: vi.fn(),
};
