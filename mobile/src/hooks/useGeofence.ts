import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { geofenceService, readAndClearLiveActivityEvent } from '@/services/geofence.service';
import { useLocationPermission } from './useLocationPermission';
import { useLiveActivity } from './useLiveActivity';

import type { Place } from '@/types/place';

type GeofenceEventType = 'enter' | 'exit';

type UseGeofenceReturn = {
  isMonitoring: boolean;
  isEnabled: boolean;
  offlineCount: number;
  permissionStatus: 'undetermined' | 'foreground_only' | 'always' | 'denied';
  isPermissionLoading: boolean;
  startMonitoring: (places: Place[]) => Promise<boolean>;
  stopMonitoring: () => Promise<boolean>;
  syncOfflineEvents: () => Promise<number>;
  requestPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  /** Register a callback for geofence events (FE-5: Live Activity integration). */
  onGeofenceEvent: (callback: GeofenceEventCallback) => void;
};

type GeofenceEventCallback = (
  eventType: GeofenceEventType,
  placeId: string,
) => void;

export function useGeofence(): UseGeofenceReturn {
  const {
    status: permissionStatus,
    isLoading: isPermissionLoading,
    requestBackground,
    openSettings,
  } = useLocationPermission();
  const liveActivity = useLiveActivity();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const syncAttempted = useRef(false);
  const geofenceCallbackRef = useRef<GeofenceEventCallback | null>(null);

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

  // ─── FE-5: Live Activity Integration on Geofence Events ────
  // Bug #1 fix: Background TaskManager can't access React refs.
  // Instead, the background task writes events to AsyncStorage, and we
  // read them when the app returns to foreground (AppState 'active').

  useEffect(() => {
    if (!liveActivity.isSupported) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void checkPendingGeofenceEvent();
    });

    // Also check immediately on mount (app may already be active)
    void checkPendingGeofenceEvent();

    return () => {
      subscription.remove();
    };
  }, [liveActivity.isSupported, liveActivity.isActive]);

  const checkPendingGeofenceEvent = async (): Promise<void> => {
    const event = await readAndClearLiveActivityEvent();
    if (!event) return;

    // Dispatch to registered callback (for external consumers)
    if (geofenceCallbackRef.current) {
      geofenceCallbackRef.current(event.eventType, event.placeId);
    }

    // Handle Live Activity state transitions
    if (!liveActivity.isActive) return;

    if (event.eventType === 'exit') {
      void liveActivity.update({
        optimalDepartureAt: new Date().toISOString(),
        estimatedTravelMin: 0,
        status: 'inTransit',
        minutesUntilDeparture: 0,
        hasTrafficDelay: false,
      });
    }

    if (event.eventType === 'enter') {
      void liveActivity.end();
    }
  };

  const syncOfflineIfNeeded = async (): Promise<void> => {
    const count = await geofenceService.getOfflineQueueCount();
    if (count === 0) return;

    // Attempt sync; if network is unavailable, sendEventToServer will fail
    // and the queue remains intact
    //
    // 반환값으로 갱신 여부를 가르면 안 된다. 서버가 배치를 전부 ignored(디바운스)나
    // failed(삭제된 장소)로 처리하면 processed=0으로 정상 응답하고, 그때도
    // syncOfflineEvents는 큐를 비운다(막힌 큐 방지). 큐가 실제로 비었는지는
    // 반환값이 아니라 큐를 다시 세어서 판단한다.
    await geofenceService.syncOfflineEvents();
    const remaining = await geofenceService.getOfflineQueueCount();
    setOfflineCount(remaining);
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

  // startMonitoring과 같은 계약: 실패하면 boolean으로 알린다.
  //
  // 예전에는 Promise<void>였다. stopGeofencing()이 거절하면(네이티브 태스크 해제 실패 등)
  // setIsEnabled(false)까지 닿지 못해 스위치가 켜진 채로 남고, 호출부의 `void`가 거절을
  // 삼켜 화면 어디에도 흔적이 없었다. 감지를 껐다고 믿은 사용자는 실제로는 계속
  // 감지되는 상태로 남는다 — 끄기 실패가 켜기 실패보다 위험한 쪽이다.
  const stopMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      await geofenceService.stopGeofencing();
      setIsMonitoring(false);
      setIsEnabled(false);
      return true;
    } catch (error) {
      console.error('[Geofence] Failed to stop monitoring:', error);
      return false;
    }
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

  const onGeofenceEvent = useCallback(
    (callback: GeofenceEventCallback): void => {
      geofenceCallbackRef.current = callback;
    },
    [],
  );

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
    onGeofenceEvent,
  };
}
