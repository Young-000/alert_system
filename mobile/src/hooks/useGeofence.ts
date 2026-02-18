import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { geofenceService } from '@/services/geofence.service';
import { useLocationPermission } from './useLocationPermission';

import type { Place } from '@/types/place';

type UseGeofenceReturn = {
  isMonitoring: boolean;
  isEnabled: boolean;
  offlineCount: number;
  permissionStatus: 'undetermined' | 'foreground_only' | 'always' | 'denied';
  isPermissionLoading: boolean;
  startMonitoring: (places: Place[]) => Promise<boolean>;
  stopMonitoring: () => Promise<void>;
  syncOfflineEvents: () => Promise<number>;
  requestPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
};

export function useGeofence(): UseGeofenceReturn {
  const {
    status: permissionStatus,
    isLoading: isPermissionLoading,
    requestBackground,
    openSettings,
  } = useLocationPermission();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const syncAttempted = useRef(false);

  // Check geofencing state on mount
  useEffect(() => {
    const checkState = async (): Promise<void> => {
      const active = await geofenceService.isGeofencingActive();
      setIsMonitoring(active);
      setIsEnabled(active);

      const count = await geofenceService.getOfflineQueueCount();
      setOfflineCount(count);
    };

    void checkState();
  }, []);

  // Auto-sync offline events when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !syncAttempted.current) {
        syncAttempted.current = true;
        void syncOfflineIfNeeded();
      }
    });

    return () => {
      subscription.remove();
      syncAttempted.current = false;
    };
  }, []);

  const syncOfflineIfNeeded = async (): Promise<void> => {
    const count = await geofenceService.getOfflineQueueCount();
    if (count === 0) return;

    // Attempt sync; if network is unavailable, sendEventToServer will fail
    // and the queue remains intact
    const synced = await geofenceService.syncOfflineEvents();
    if (synced > 0) {
      const remaining = await geofenceService.getOfflineQueueCount();
      setOfflineCount(remaining);
    }
  };

  const startMonitoring = useCallback(
    async (places: Place[]): Promise<boolean> => {
      // Check permission
      if (permissionStatus !== 'always') {
        const granted = await requestBackground();
        if (!granted) return false;
      }

      try {
        await geofenceService.startGeofencing(places);
        setIsMonitoring(true);
        setIsEnabled(true);
        return true;
      } catch (error) {
        console.error('[Geofence] Failed to start monitoring:', error);
        return false;
      }
    },
    [permissionStatus, requestBackground],
  );

  const stopMonitoring = useCallback(async (): Promise<void> => {
    await geofenceService.stopGeofencing();
    setIsMonitoring(false);
    setIsEnabled(false);
  }, []);

  const syncOfflineEvents = useCallback(async (): Promise<number> => {
    const synced = await geofenceService.syncOfflineEvents();
    const remaining = await geofenceService.getOfflineQueueCount();
    setOfflineCount(remaining);
    return synced;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return requestBackground();
  }, [requestBackground]);

  return {
    isMonitoring,
    isEnabled,
    offlineCount,
    permissionStatus,
    isPermissionLoading,
    startMonitoring,
    stopMonitoring,
    syncOfflineEvents,
    requestPermission,
    openSettings,
  };
}
