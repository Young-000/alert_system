import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { commuteEventService } from './commute-event.service';

import type { RecordCommuteEventDto } from '@/types/commute-event';
import type { Place } from '@/types/place';

// ─── Constants ──────────────────────────────────────

export const GEOFENCE_TASK_NAME = 'commute-geofence-task';
const OFFLINE_QUEUE_KEY = '@geofence_offline_queue';
const LIVE_ACTIVITY_EVENT_KEY = '@geofence_live_activity_event';
const MAX_BATCH_SIZE = 50;

// ─── Live Activity Event Queue (Background → Foreground) ─────

type LiveActivityGeofenceEvent = {
  eventType: 'enter' | 'exit';
  placeId: string;
  triggeredAt: string;
};

async function writeLiveActivityEvent(
  event: LiveActivityGeofenceEvent,
): Promise<void> {
  try {
    await AsyncStorage.setItem(LIVE_ACTIVITY_EVENT_KEY, JSON.stringify(event));
  } catch {
    // Non-critical: Live Activity update is best-effort from background
  }
}

async function readAndClearLiveActivityEvent(): Promise<LiveActivityGeofenceEvent | null> {
  try {
    const raw = await AsyncStorage.getItem(LIVE_ACTIVITY_EVENT_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(LIVE_ACTIVITY_EVENT_KEY);
    return JSON.parse(raw) as LiveActivityGeofenceEvent;
  } catch {
    return null;
  }
}

// ─── Offline Queue ──────────────────────────────────

async function getOfflineQueue(): Promise<RecordCommuteEventDto[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecordCommuteEventDto[];
  } catch {
    return [];
  }
}

async function addToOfflineQueue(event: RecordCommuteEventDto): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(event);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * 이벤트의 동일성 키. 서버가 디바운스 판정에 쓰는 세 값과 같다
 * (`process-commute-event.use-case`의 findRecent).
 */
function eventKey(event: RecordCommuteEventDto): string {
  return `${event.placeId}|${event.eventType}|${event.triggeredAt}`;
}

/**
 * 업로드가 끝난 이벤트만 큐에서 뺀다.
 *
 * 큐 전체를 `removeItem`하면 안 된다. 업로드는 네트워크를 기다리는 동안 여러 번
 * await하고, 그 사이 백그라운드 지오펜스 태스크가 같은 키에 이벤트를 적재한다
 * (`defineGeofenceTask`의 addToOfflineQueue). 통째로 지우면 그 이벤트는 **서버에
 * 올라간 적도 없이** 사라진다 — 출근 exit 하나가 유실되면 그날 자동 세션 자체가
 * 만들어지지 않는다.
 */
async function removeFromOfflineQueue(
  uploaded: RecordCommuteEventDto[],
): Promise<void> {
  const uploadedKeys = new Set(uploaded.map(eventKey));
  const remaining = (await getOfflineQueue()).filter(
    (event) => !uploadedKeys.has(eventKey(event)),
  );

  if (remaining.length === 0) {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
}

// ─── Event Handling ─────────────────────────────────

function mapGeofenceEventType(
  eventType: Location.GeofencingEventType,
): 'enter' | 'exit' | null {
  if (eventType === Location.GeofencingEventType.Enter) return 'enter';
  if (eventType === Location.GeofencingEventType.Exit) return 'exit';
  return null;
}

async function sendEventToServer(event: RecordCommuteEventDto): Promise<boolean> {
  try {
    await commuteEventService.recordEvent(event);
    return true;
  } catch {
    return false;
  }
}

// ─── Background Task Definition ─────────────────────

export function defineGeofenceTask(): void {
  if (TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) return;

  TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[Geofence] Task error:', error.message);
      return;
    }

    if (!data) return;

    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };

    const mappedEventType = mapGeofenceEventType(eventType);
    if (!mappedEventType || !region.identifier) return;

    const event: RecordCommuteEventDto = {
      placeId: region.identifier,
      eventType: mappedEventType,
      triggeredAt: new Date().toISOString(),
      latitude: region.latitude,
      longitude: region.longitude,
    };

    // Write event for Live Activity foreground consumption (Bug #1 fix)
    await writeLiveActivityEvent({
      eventType: mappedEventType,
      placeId: region.identifier,
      triggeredAt: event.triggeredAt,
    });

    const sent = await sendEventToServer(event);
    if (!sent) {
      await addToOfflineQueue(event);
    }
  });
}

// ─── Offline Sync ───────────────────────────────────

/**
 * 진행 중인 동기화. 겹친 호출은 이 프라미스를 함께 기다린다.
 */
let inFlightSync: Promise<number> | null = null;

async function runOfflineSync(): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  // Batch in chunks of MAX_BATCH_SIZE
  const batches: RecordCommuteEventDto[][] = [];
  for (let i = 0; i < queue.length; i += MAX_BATCH_SIZE) {
    batches.push(queue.slice(i, i + MAX_BATCH_SIZE));
  }

  // 올라간 배치를 따로 모은다. 중간 배치가 실패했을 때 큐를 통째로 남기면
  // 다음 동기화가 이미 올린 이벤트를 다시 올린다 — 오프라인 큐의 이벤트는
  // triggeredAt이 이미 오래됐으므로 서버의 5분 디바운스에 걸리지 않고 재처리된다.
  const uploaded: RecordCommuteEventDto[] = [];
  let totalProcessed = 0;

  try {
    for (const batch of batches) {
      const result = await commuteEventService.batchUpload({ events: batch });
      totalProcessed += result.processed;
      uploaded.push(...batch);
    }
  } catch {
    // 남은 배치는 큐에 그대로 두고 다음 동기화에 맡긴다.
  } finally {
    if (uploaded.length > 0) {
      await removeFromOfflineQueue(uploaded);
    }
  }

  return totalProcessed;
}

// ─── Geofence Service ───────────────────────────────

export { readAndClearLiveActivityEvent };

export const geofenceService = {
  /**
   * Start geofence monitoring for given places.
   * Only monitors places with isActive=true.
   */
  async startGeofencing(places: Place[]): Promise<void> {
    const activePlaces = places.filter((p) => p.isActive);
    if (activePlaces.length === 0) {
      await this.stopGeofencing();
      return;
    }

    const regions: Location.LocationRegion[] = activePlaces.map((place) => ({
      identifier: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      radius: place.radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));

    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
  },

  /**
   * Stop all geofence monitoring.
   */
  async stopGeofencing(): Promise<void> {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  },

  /**
   * Check if geofencing is currently active.
   */
  async isGeofencingActive(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  },

  /**
   * Sync offline events to server.
   * Returns the number of events successfully synced.
   *
   * 진행 중인 동기화가 있으면 그 프라미스를 그대로 돌려준다. `useGeofence`는
   * 화면마다 인스턴스가 생기고(설정 탭·장소 화면) 각자 AppState 리스너를 등록하므로
   * 포그라운드 복귀 한 번에 두 호출이 겹친다. 둘 다 같은 큐를 읽어 올리면 서버에
   * 같은 이벤트가 두 행으로 남는다 — 오프라인 큐의 이벤트는 triggeredAt이 이미
   * 오래됐으므로 서버의 5분 디바운스(`findRecent`)가 걷어내지 못한다.
   *
   * 영구 래치가 아니라 **진행 중인 동안만**이다. 끝나면 다시 받아야 그 뒤에 쌓인
   * 이벤트가 올라간다.
   */
  async syncOfflineEvents(): Promise<number> {
    if (inFlightSync) return inFlightSync;

    inFlightSync = runOfflineSync().finally(() => {
      inFlightSync = null;
    });
    return inFlightSync;
  },

  /**
   * Get count of pending offline events.
   */
  async getOfflineQueueCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.length;
  },
};
