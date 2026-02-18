import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const MODULE_NAME = 'WidgetDataSync';

// Load native module on both iOS and Android.
// Only unavailable on web, which has no widget support.
const nativeModule =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? requireNativeModule(MODULE_NAME)
    : null;

/**
 * Syncs widget display data to platform-specific storage.
 * - iOS: Writes JSON to App Group UserDefaults and reloads WidgetKit timelines.
 * - Android: Writes JSON to SharedPreferences for the widget task handler.
 *
 * No-ops on unsupported platforms (web).
 */
export async function syncWidgetData(data: Record<string, unknown>): Promise<void> {
  if (!nativeModule) return;
  const jsonString = JSON.stringify(data);
  await nativeModule.syncWidgetData(jsonString);
}

/**
 * Reads cached widget data JSON from platform-specific storage.
 * - iOS: Not used (WidgetKit extension reads directly from App Group UserDefaults).
 * - Android: Reads from SharedPreferences for the widget task handler.
 *
 * Returns null on unsupported platforms or when no data is cached.
 */
export async function getWidgetData(): Promise<string | null> {
  if (!nativeModule) return null;
  return await nativeModule.getWidgetData();
}

/**
 * Clears widget data from platform-specific storage.
 * - iOS: Removes from App Group UserDefaults and reloads timelines.
 * - Android: Removes from SharedPreferences.
 *
 * No-ops on unsupported platforms (web).
 */
export async function clearWidgetData(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.clearWidgetData();
}

/**
 * Syncs the JWT auth token for the widget extension.
 * - iOS: Writes to shared Keychain Access Group so the widget extension
 *   (separate process) can authenticate API calls.
 * - Android: No-op. The widget task handler runs in the app's JS context
 *   and does not make its own API calls.
 *
 * No-ops on unsupported platforms (web).
 */
export async function syncAuthToken(token: string): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.syncAuthToken(token);
}

/**
 * Clears the JWT auth token from the widget extension's storage.
 * - iOS: Removes from shared Keychain Access Group.
 * - Android: No-op.
 *
 * No-ops on unsupported platforms (web).
 */
export async function clearAuthToken(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.clearAuthToken();
}
