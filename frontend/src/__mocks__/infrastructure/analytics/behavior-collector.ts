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
  // 실물(behavior-collector.ts)이 노출하는 메서드는 전부 있어야 한다.
  // initialize는 로그인 상태에서만 호출돼 오래 빠져 있어도 드러나지 않았다.
  initialize: vi.fn(),
  setTrackingEnabled: vi.fn(),
  isAvailable: vi.fn(() => false),
  track: vi.fn(),
  flush: vi.fn(),
  setUserId: vi.fn(),
};
