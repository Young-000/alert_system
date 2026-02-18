import React from 'react';
import { Platform } from 'react-native';

import {
  syncWidgetData as nativeSyncWidgetData,
  clearWidgetData as nativeClearWidgetData,
  syncAuthToken as nativeSyncAuthToken,
  clearAuthToken as nativeClearAuthToken,
} from '../../modules/widget-data-sync';

import type { WidgetDataResponse } from '@/types/home';

const IS_IOS = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';

/**
 * Triggers requestWidgetUpdate for both Android widget sizes.
 * Wrapped in a helper to avoid importing react-native-android-widget on iOS.
 */
async function updateAndroidWidgets(data: WidgetDataResponse | null): Promise<void> {
  // Dynamic import to avoid loading react-native-android-widget on iOS
  const { requestWidgetUpdate } = await import('react-native-android-widget');
  const { CommuteSmallWidget } = await import('@/widgets/CommuteSmallWidget');
  const { CommuteMediumWidget } = await import('@/widgets/CommuteMediumWidget');

  const isLoggedIn = data !== null;

  requestWidgetUpdate({
    widgetName: 'CommuteSmall',
    renderWidget: () =>
      React.createElement(CommuteSmallWidget, { data, isLoggedIn }),
    widgetNotFound: () => {
      // Widget not on home screen -- no-op
    },
  });

  requestWidgetUpdate({
    widgetName: 'CommuteMedium',
    renderWidget: () =>
      React.createElement(CommuteMediumWidget, { data, isLoggedIn }),
    widgetNotFound: () => {
      // Widget not on home screen -- no-op
    },
  });
}

/**
 * Widget data sync service.
 * Bridges the React Native app with platform-specific widget systems:
 * - iOS: WidgetKit extension via App Group UserDefaults + Keychain
 * - Android: SharedPreferences + react-native-android-widget requestWidgetUpdate
 *
 * All methods gracefully no-op on unsupported platforms (web).
 */
export const widgetSyncService = {
  /**
   * Syncs widget display data to the platform-specific storage
   * and triggers a widget refresh.
   *
   * - iOS: Writes to App Group UserDefaults, reloads WidgetKit timelines.
   * - Android: Writes to SharedPreferences, calls requestWidgetUpdate().
   */
  async syncWidgetData(data: WidgetDataResponse): Promise<void> {
    if (IS_IOS) {
      try {
        await nativeSyncWidgetData(data as unknown as Record<string, unknown>);
      } catch (error) {
        console.warn('[WidgetSync] Failed to sync widget data (iOS):', error);
      }
      return;
    }

    if (IS_ANDROID) {
      try {
        // 1. Persist to SharedPreferences via native module
        await nativeSyncWidgetData(data as unknown as Record<string, unknown>);
        // 2. Trigger immediate widget re-render
        await updateAndroidWidgets(data);
      } catch (error) {
        console.warn('[WidgetSync] Failed to sync widget data (Android):', error);
      }
      return;
    }
  },

  /**
   * Clears widget data from platform-specific storage.
   * Called when the user's data should no longer be displayed (e.g., logout).
   *
   * - iOS: Removes from App Group UserDefaults, reloads timelines.
   * - Android: Removes from SharedPreferences, updates widgets to logged-out state.
   */
  async clearWidgetData(): Promise<void> {
    if (IS_IOS) {
      try {
        await nativeClearWidgetData();
      } catch (error) {
        console.warn('[WidgetSync] Failed to clear widget data (iOS):', error);
      }
      return;
    }

    if (IS_ANDROID) {
      try {
        // 1. Clear SharedPreferences
        await nativeClearWidgetData();
        // 2. Update widgets to show logged-out state
        await updateAndroidWidgets(null);
      } catch (error) {
        console.warn('[WidgetSync] Failed to clear widget data (Android):', error);
      }
      return;
    }
  },

  /**
   * Syncs the JWT auth token for the widget extension.
   *
   * - iOS: Writes to shared Keychain Access Group so the WidgetKit extension
   *   (separate process) can make authenticated API calls.
   * - Android: No-op. The widget task handler runs in the app's JS context
   *   and does not make its own API calls (reads cached SharedPreferences).
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
   * Clears the JWT auth token from the widget extension's storage.
   * Called on logout to ensure the widget shows the logged-out state.
   *
   * - iOS: Removes from shared Keychain Access Group.
   * - Android: No-op (auth token not shared separately).
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
