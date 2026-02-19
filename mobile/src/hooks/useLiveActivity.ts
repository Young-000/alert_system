import { useCallback, useEffect, useRef, useState } from 'react';

import { liveActivityService } from '@/services/live-activity.service';

import type {
  LiveActivityInfo,
  LiveActivityState,
  StartLiveActivityParams,
  UpdateLiveActivityParams,
} from '@/types/live-activity';

// ─── Live Activity Hook (FE-3) ──────────────────────

/**
 * Manages the full lifecycle of an iOS Live Activity:
 * - Checks device support on mount
 * - Restores existing activity state
 * - Provides start/update/end methods
 * - Handles push token registration with the server
 * - Observes push token updates
 */
export function useLiveActivity(): LiveActivityState {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [activityInfo, setActivityInfo] = useState<LiveActivityInfo | null>(null);
  const settingIdRef = useRef<string | null>(null);
  const modeRef = useRef<'commute' | 'return'>('commute');
  const tokenListenerRef = useRef<(() => void) | null>(null);

  // ─── Check Support + Restore on Mount ──────────

  useEffect(() => {
    const initialize = async (): Promise<void> => {
      const supported = await liveActivityService.isSupported();
      setIsSupported(supported);

      if (!supported) return;

      // Restore existing activity if any
      const existing = await liveActivityService.getActiveActivity();
      if (existing?.isActive) {
        setActivityInfo(existing);
        setIsActive(true);
      }
    };

    void initialize();
  }, []);

  // ─── Push Token Observer ───────────────────────

  useEffect(() => {
    if (!isActive || !activityInfo) return;

    const unsubscribe = liveActivityService.addPushTokenListener(
      (event) => {
        // Update the stored push token
        setActivityInfo((prev) => {
          if (!prev || prev.activityId !== event.activityId) return prev;
          return { ...prev, pushToken: event.pushToken };
        });

        // Re-register with server
        if (settingIdRef.current) {
          void registerTokenWithServer(
            event.activityId,
            event.pushToken,
            settingIdRef.current,
          );
        }
      },
    );

    tokenListenerRef.current = unsubscribe;

    return () => {
      unsubscribe();
      tokenListenerRef.current = null;
    };
  }, [isActive, activityInfo?.activityId]);

  // ─── Register Push Token with Server ───────────

  const registerTokenWithServer = useCallback(
    async (
      activityId: string,
      pushToken: string,
      settingId: string,
    ): Promise<void> => {
      if (!pushToken) return;

      try {
        await liveActivityService.registerPushToken({
          pushToken,
          activityId,
          mode: modeRef.current,
          settingId,
        });
      } catch (error) {
        console.error('[LiveActivity] Failed to register push token:', error);
      }
    },
    [],
  );

  // ─── Start ─────────────────────────────────────

  const start = useCallback(
    async (
      params: StartLiveActivityParams,
      settingId: string,
    ): Promise<boolean> => {
      if (!isSupported) return false;

      try {
        const info = await liveActivityService.startActivity(params);
        if (!info) return false;

        setActivityInfo(info);
        setIsActive(true);
        settingIdRef.current = settingId;
        modeRef.current = params.mode;

        // Register push token with server
        if (info.pushToken) {
          try {
            await liveActivityService.registerPushToken({
              pushToken: info.pushToken,
              activityId: info.activityId,
              mode: params.mode,
              settingId,
            });
          } catch {
            // Non-critical: Live Activity works without push-to-update
            console.warn('[LiveActivity] Push token registration failed (non-critical)');
          }
        }

        return true;
      } catch (error) {
        console.error('[LiveActivity] Failed to start:', error);
        return false;
      }
    },
    [isSupported],
  );

  // ─── Update ────────────────────────────────────

  const update = useCallback(
    async (
      params: Omit<UpdateLiveActivityParams, 'activityId'>,
    ): Promise<boolean> => {
      if (!activityInfo?.activityId) return false;

      try {
        return await liveActivityService.updateActivity({
          ...params,
          activityId: activityInfo.activityId,
        });
      } catch (error) {
        console.error('[LiveActivity] Failed to update:', error);
        return false;
      }
    },
    [activityInfo?.activityId],
  );

  // ─── End ───────────────────────────────────────

  const end = useCallback(async (): Promise<boolean> => {
    if (!activityInfo?.activityId) return false;

    try {
      const ended = await liveActivityService.endActivity(activityInfo.activityId);
      if (ended) {
        // Deregister push token from server
        try {
          await liveActivityService.deregisterToken(activityInfo.activityId);
        } catch {
          // Non-critical
        }

        setActivityInfo(null);
        setIsActive(false);
        settingIdRef.current = null;
        modeRef.current = 'commute';
      }
      return ended;
    } catch (error) {
      console.error('[LiveActivity] Failed to end:', error);
      return false;
    }
  }, [activityInfo?.activityId]);

  // ─── End All ───────────────────────────────────

  const endAll = useCallback(async (): Promise<boolean> => {
    try {
      const ended = await liveActivityService.endAllActivities();
      if (ended) {
        // Deregister current token if exists
        if (activityInfo?.activityId) {
          try {
            await liveActivityService.deregisterToken(activityInfo.activityId);
          } catch {
            // Non-critical
          }
        }

        setActivityInfo(null);
        setIsActive(false);
        settingIdRef.current = null;
      }
      return ended;
    } catch (error) {
      console.error('[LiveActivity] Failed to end all:', error);
      return false;
    }
  }, [activityInfo?.activityId]);

  return {
    isSupported,
    isActive,
    activityInfo,
    start,
    update,
    end,
    endAll,
  };
}
