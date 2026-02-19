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

async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
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
   */
  async syncOfflineEvents(): Promise<number> {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return 0;

    try {
      // Batch in chunks of MAX_BATCH_SIZE
      const batches: RecordCommuteEventDto[][] = [];
      for (let i = 0; i < queue.length; i += MAX_BATCH_SIZE) {
        batches.push(queue.slice(i, i + MAX_BATCH_SIZE));
      }

      let totalProcessed = 0;
      for (const batch of batches) {
        const result = await commuteEventService.batchUpload({ events: batch });
        totalProcessed += result.processed;
      }

      await clearOfflineQueue();
      return totalProcessed;
    } catch {
      // Keep queue intact on failure
      return 0;
    }
  },

  /**
   * Get count of pending offline events.
   */
  async getOfflineQueueCount(): Promise<number> {
    const queue = await getOfflineQueue();
    return queue.length;
  },
};
