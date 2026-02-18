import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const MODULE_NAME = 'WidgetDataSync';

// Safely require the native module (only available on iOS)
const nativeModule =
  Platform.OS === 'ios' ? requireNativeModule(MODULE_NAME) : null;

/**
 * Syncs widget display data to the App Group UserDefaults.
 * Writes JSON string to UserDefaults(suiteName: "group.com.commutemate.app")
 * and triggers WidgetCenter.shared.reloadTimelines(ofKind: "CommuteWidget").
 *
 * No-ops on non-iOS platforms.
 */
export async function syncWidgetData(data: Record<string, unknown>): Promise<void> {
  if (!nativeModule) return;
  const jsonString = JSON.stringify(data);
  await nativeModule.syncWidgetData(jsonString);
}

/**
 * Clears widget data from App Group UserDefaults
 * and triggers a widget timeline reload.
 *
 * No-ops on non-iOS platforms.
 */
export async function clearWidgetData(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.clearWidgetData();
}

/**
 * Syncs the JWT auth token to the shared Keychain Access Group
 * so the widget extension can authenticate API calls.
 *
 * No-ops on non-iOS platforms.
 */
export async function syncAuthToken(token: string): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.syncAuthToken(token);
}

/**
 * Clears the JWT auth token from the shared Keychain Access Group.
 * Called on logout to ensure the widget shows the logged-out state.
 *
 * No-ops on non-iOS platforms.
 */
export async function clearAuthToken(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.clearAuthToken();
}
