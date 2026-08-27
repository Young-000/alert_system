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
  /**
   * 감지를 켠다. 권한이 'always'가 아니면 먼저 묻는다.
   *
   * 목록 변경에 맞춰 부를 때는 `syncMonitoredPlaces`를 쓴다 — 이쪽은 활성 장소가
   * 없는 경우를 호출부가 알아서 처리해야 하고, 그걸 빠뜨린 것이 지운 장소가
   * 계속 감지되던 원인이었다.
   */
  startMonitoring: (places: Place[]) => Promise<boolean>;
  stopMonitoring: () => Promise<boolean>;
  /**
   * 장소 목록에 감시 대상을 맞춘다. 활성 장소가 없으면 감지를 끈다.
   * 꺼져 있었다면 켠다 — "장소를 등록하면 자동 감지가 시작됩니다"를 따르는 쪽이다.
   */
  syncMonitoredPlaces: (places: Place[]) => Promise<boolean>;
  /**
   * 감지가 돌고 있을 때만 대상을 맞춘다. 활성 장소가 없으면 언제나 끈다.
   * 삭제·끄기처럼 감지를 시작할 이유가 없는 변경에 쓴다.
   */
  syncIfMonitoring: (places: Place[]) => Promise<boolean>;
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

      // 감시 대상이 되는 건 활성 장소뿐이고, 하나도 없으면 startGeofencing은
      // 등록이 아니라 stopGeofencing을 한다(geofence.service.ts:140-145).
      // 예전에는 그 경우에도 setIsEnabled(true)를 해서, 실제로는 멈춘 감지를
      // 설정 화면이 "켜짐 · N개 장소 감지 중"으로 표시했다.
      // 서비스가 실제로 한 일에서 상태를 끌어낸다.
      const isActiveAfter = places.some((place) => place.isActive);

      try {
        await geofenceService.startGeofencing(places);
        setIsMonitoring(isActiveAfter);
        setIsEnabled(isActiveAfter);
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

  // 장소 목록이 바뀐 뒤 감시 대상을 목록에 맞춘다.
  //
  // 화면마다 따로 판단하면 방향이 갈린다. 실제로 삭제 핸들러는 남은 장소가
  // 없을 때 아무것도 하지 않아서, 지운 장소의 region이 네이티브에 등록된 채로
  // 남았다 — 그 지점을 드나들 때마다 서버가 모르는 placeId로 이벤트가 올라가고
  // (오프라인 큐로 갔다가 버려진다), 설정 화면은 장소가 0개라 스위치를 잠가서
  // 끄지도 못했다.
  //
  // 활성 장소가 없으면 `stopMonitoring`으로 간다. `startMonitoring([])`도
  // 서비스 단에서는 정지로 귀결되지만, 그 경로는 권한이 'always'가 아닐 때
  // 백그라운드 위치 권한을 먼저 묻는다 — 감지를 *끄는* 데 권한을 물을 이유는 없다.
  const syncMonitoredPlaces = useCallback(
    async (places: Place[]): Promise<boolean> => {
      const hasActive = places.some((place) => place.isActive);
      return hasActive ? startMonitoring(places) : stopMonitoring();
    },
    [startMonitoring, stopMonitoring],
  );

  // 감지가 돌고 있을 때만 대상을 맞춘다. 정리(활성 장소 0개)는 언제나 한다.
  //
  // 삭제·끄기는 감지를 *켜는* 동작이 아니다. 그런데 삭제 핸들러가 남은 장소로
  // 그냥 `startMonitoring`을 불러서, 자동 감지를 꺼둔 사용자가 장소 하나를
  // 지우면 백그라운드 위치 감지가 다시 켜졌다(권한이 'always'가 아니면 권한
  // 요청까지 떴다). 등록은 감지를 시작한다는 제품 규칙(`syncMonitoredPlaces`)이
  // 삭제에까지 번진 결과다.
  const syncIfMonitoring = useCallback(
    async (places: Place[]): Promise<boolean> => {
      const hasActive = places.some((place) => place.isActive);
      if (!hasActive) return stopMonitoring();
      if (!isMonitoring) return true;
      return startMonitoring(places);
    },
    [isMonitoring, startMonitoring, stopMonitoring],
  );

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
    syncMonitoredPlaces,
    syncIfMonitoring,
    syncOfflineEvents,
    requestPermission,
    openSettings,
    onGeofenceEvent,
  };
}
