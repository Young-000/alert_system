import { useCallback, useEffect, useRef, useState } from 'react';

import { smartDepartureService } from '@/services/smart-departure.service';
import { useAuth } from './useAuth';
import { useLiveActivity } from './useLiveActivity';

import type {
  SmartDepartureSnapshotDto,
  SmartDepartureTodayResponse,
} from '@/types/smart-departure';
import type {
  LiveActivityMode,
  LiveActivityStatus,
} from '@/types/live-activity';

type UseSmartDepartureTodayReturn = {
  commute: SmartDepartureSnapshotDto | null;
  return_: SmartDepartureSnapshotDto | null;
  isLoading: boolean;
  error: string | null;
  /** Current minutes until next departure (recalculated every 60s). */
  commuteMinutes: number | null;
  returnMinutes: number | null;
  refresh: () => Promise<void>;
};

/** Threshold (minutes) to auto-start Live Activity before departure. */
const LIVE_ACTIVITY_START_THRESHOLD_MIN = 60;

/** Threshold (minutes past departure) to auto-end Live Activity. */
const LIVE_ACTIVITY_TIMEOUT_MIN = 30;

function calcMinutesUntil(isoDatetime: string): number {
  const targetMs = new Date(isoDatetime).getTime();
  const nowMs = Date.now();
  return Math.round((targetMs - nowMs) / 60_000);
}

function determineStatus(minutesUntil: number): LiveActivityStatus {
  if (minutesUntil <= 0) return 'departureNow';
  if (minutesUntil <= 10) return 'departureSoon';
  return 'preparing';
}

export function useSmartDepartureToday(): UseSmartDepartureTodayReturn {
  const { user } = useAuth();
  const liveActivity = useLiveActivity();
  const [data, setData] = useState<SmartDepartureTodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commuteMinutes, setCommuteMinutes] = useState<number | null>(null);
  const [returnMinutes, setReturnMinutes] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveActivityStartedRef = useRef(false);

  const updateCountdowns = useCallback(
    (todayData: SmartDepartureTodayResponse | null): void => {
      if (!todayData) {
        setCommuteMinutes(null);
        setReturnMinutes(null);
        return;
      }

      if (todayData.commute) {
        setCommuteMinutes(
          calcMinutesUntil(todayData.commute.optimalDepartureAt),
        );
      } else {
        setCommuteMinutes(null);
      }

      if (todayData.return) {
        setReturnMinutes(
          calcMinutesUntil(todayData.return.optimalDepartureAt),
        );
      } else {
        setReturnMinutes(null);
      }
    },
    [],
  );

  const fetchToday = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const response = await smartDepartureService.fetchToday();
      setData(response);
      setError(null);
      updateCountdowns(response);
    } catch {
      setError('출발 정보를 불러올 수 없어요');
    }
  }, [user, updateCountdowns]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchToday().finally(() => setIsLoading(false));
  }, [user, fetchToday]);

  // 1-minute countdown timer
  useEffect(() => {
    if (!data) return;

    intervalRef.current = setInterval(() => {
      updateCountdowns(data);
    }, 60_000);

    return (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data, updateCountdowns]);

  // ─── FE-4: Live Activity Auto-Start / Update / Auto-End ─────

  useEffect(() => {
    if (!liveActivity.isSupported || !data) return;

    // Determine which snapshot is relevant (commute or return)
    const snapshot = data.commute ?? data.return;
    if (!snapshot) return;

    const minutesUntil = calcMinutesUntil(snapshot.optimalDepartureAt);
    const mode: LiveActivityMode =
      snapshot.departureType === 'return' ? 'return' : 'commute';

    // Auto-end: if departure time passed by more than TIMEOUT minutes
    if (minutesUntil < -LIVE_ACTIVITY_TIMEOUT_MIN && liveActivity.isActive) {
      void liveActivity.end();
      liveActivityStartedRef.current = false;
      return;
    }

    // Auto-start: within threshold and not already started
    if (
      minutesUntil <= LIVE_ACTIVITY_START_THRESHOLD_MIN &&
      minutesUntil > -LIVE_ACTIVITY_TIMEOUT_MIN &&
      !liveActivity.isActive &&
      !liveActivityStartedRef.current
    ) {
      liveActivityStartedRef.current = true;
      const modeLabel = mode === 'return' ? '퇴근' : '출근';
      void liveActivity.start(
        {
          mode,
          routeName: `${modeLabel} ${snapshot.arrivalTarget} 경로`,
          arrivalTarget: snapshot.arrivalTarget,
          checkpoints: [],
          optimalDepartureAt: snapshot.optimalDepartureAt,
          estimatedTravelMin: snapshot.estimatedTravelMin,
        },
        snapshot.settingId,
      );
      return;
    }

    // Auto-update: if Live Activity is active, push latest data
    if (liveActivity.isActive) {
      const status = determineStatus(minutesUntil);

      void liveActivity.update({
        optimalDepartureAt: snapshot.optimalDepartureAt,
        estimatedTravelMin: snapshot.estimatedTravelMin,
        status,
        minutesUntilDeparture: Math.max(0, minutesUntil),
        hasTrafficDelay: snapshot.realtimeAdjustmentMin
          ? snapshot.realtimeAdjustmentMin > 5
          : false,
        trafficDelayMessage: snapshot.realtimeAdjustmentMin
          ? `+${snapshot.realtimeAdjustmentMin}분 지연`
          : undefined,
      });
    }
  }, [
    data,
    commuteMinutes,
    returnMinutes,
    liveActivity.isSupported,
    liveActivity.isActive,
  ]);

  // Reset started flag when Live Activity ends externally
  useEffect(() => {
    if (!liveActivity.isActive) {
      liveActivityStartedRef.current = false;
    }
  }, [liveActivity.isActive]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchToday();
  }, [fetchToday]);

  return {
    commute: data?.commute ?? null,
    return_: data?.return ?? null,
    isLoading,
    error,
    commuteMinutes,
    returnMinutes,
    refresh,
  };
}
