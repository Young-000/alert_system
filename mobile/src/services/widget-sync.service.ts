import { Platform } from 'react-native';

import {
  syncWidgetData as nativeSyncWidgetData,
  clearWidgetData as nativeClearWidgetData,
  syncAuthToken as nativeSyncAuthToken,
  clearAuthToken as nativeClearAuthToken,
} from '../../modules/widget-data-sync';

import type { WidgetDataResponse } from '@/types/home';

const IS_IOS = Platform.OS === 'ios';

/**
 * Widget data sync service.
 * Bridges the React Native app with the iOS WidgetKit extension.
 *
 * All methods gracefully no-op on non-iOS platforms.
 */
export const widgetSyncService = {
  /**
   * Syncs widget display data to the shared App Group UserDefaults
   * and triggers a widget timeline reload.
   */
  async syncWidgetData(data: WidgetDataResponse): Promise<void> {
    if (!IS_IOS) return;

    try {
      await nativeSyncWidgetData(data as unknown as Record<string, unknown>);
    } catch (error) {
      // Widget sync is non-critical; log but do not throw.
      console.warn('[WidgetSync] Failed to sync widget data:', error);
    }
  },

  /**
   * Clears widget data from the shared App Group UserDefaults.
   * Called when the user's data should no longer be displayed.
   */
  async clearWidgetData(): Promise<void> {
    if (!IS_IOS) return;

    try {
      await nativeClearWidgetData();
    } catch (error) {
      console.warn('[WidgetSync] Failed to clear widget data:', error);
    }
  },

  /**
   * Syncs the JWT auth token to the shared Keychain Access Group
   * so the WidgetKit extension can make authenticated API calls.
   */
  async syncAuthToken(token: string): Promise<void> {
    if (!IS_IOS) return;

    try {
      await nativeSyncAuthToken(token);
    } catch (error) {
      console.warn('[WidgetSync] Failed to sync auth token:', error);
    }
  },

  /**
   * Clears the JWT auth token from the shared Keychain Access Group.
   * Called on logout to ensure the widget shows the logged-out state.
   */
  async clearAuthToken(): Promise<void> {
    if (!IS_IOS) return;

    try {
      await nativeClearAuthToken();
    } catch (error) {
      console.warn('[WidgetSync] Failed to clear auth token:', error);
    }
  },
};
