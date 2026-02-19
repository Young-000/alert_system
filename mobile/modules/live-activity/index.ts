import { requireNativeModule } from 'expo-modules-core';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type {
  LiveActivityInfo,
  StartLiveActivityParams,
  UpdateLiveActivityParams,
} from '@/types/live-activity';

// ─── Native Module ──────────────────────────────────

const MODULE_NAME = 'LiveActivity';

// Load native module only on iOS where ActivityKit is available.
const nativeModule =
  Platform.OS === 'ios'
    ? (() => {
        try {
          return requireNativeModule(MODULE_NAME);
        } catch {
          // Module not available (e.g., running on Expo Go without native build)
          return null;
        }
      })()
    : null;

// Event emitter for push token updates.
const eventEmitter =
  Platform.OS === 'ios' && NativeModules[MODULE_NAME]
    ? new NativeEventEmitter(NativeModules[MODULE_NAME])
    : null;

// ─── Public API (NM-2) ─────────────────────────────

/**
 * Checks whether Live Activities are supported on this device.
 * Returns false on Android, web, or iOS < 16.1.
 */
export async function isSupported(): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.isSupported() as Promise<boolean>;
}

/**
 * Starts a new Commute Live Activity.
 * Ends any existing activity before starting a new one.
 * Returns activity info (ID + push token) or null if unsupported/failed.
 */
export async function startActivity(
  params: StartLiveActivityParams,
): Promise<LiveActivityInfo | null> {
  if (!nativeModule) return null;
  return nativeModule.startActivity(params) as Promise<LiveActivityInfo | null>;
}

/**
 * Updates an existing Live Activity with new content state.
 * Returns true on success, false if the activity was not found.
 */
export async function updateActivity(
  params: UpdateLiveActivityParams,
): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.updateActivity(params) as Promise<boolean>;
}

/**
 * Ends a specific Live Activity by its ID.
 * Shows a brief "arrived" state before dismissing.
 */
export async function endActivity(activityId: string): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.endActivity(activityId) as Promise<boolean>;
}

/**
 * Ends all active Commute Live Activities.
 */
export async function endAllActivities(): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.endAllActivities() as Promise<boolean>;
}

/**
 * Returns info about the currently active Live Activity, or null.
 */
export async function getActiveActivity(): Promise<LiveActivityInfo | null> {
  if (!nativeModule) return null;
  return nativeModule.getActiveActivity() as Promise<LiveActivityInfo | null>;
}

// ─── Push Token Observer (NM-3) ─────────────────────

type PushTokenUpdateEvent = {
  activityId: string;
  pushToken: string;
};

type PushTokenListener = (event: PushTokenUpdateEvent) => void;

/**
 * Subscribes to Live Activity push token updates.
 * Returns an unsubscribe function.
 * No-ops on non-iOS platforms.
 */
export function addPushTokenListener(
  listener: PushTokenListener,
): () => void {
  if (!eventEmitter) return () => {};

  const subscription = eventEmitter.addListener(
    'onPushTokenUpdate',
    listener,
  );

  return () => subscription.remove();
}
