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

/**
 * 오늘의 스냅샷 중 지금 Live Activity 로 띄워야 할 출발을 고른다.
 *
 * `GET /smart-departure/today` 는 오늘 것이면 이미 지난 출발도 그대로 돌려주므로
 * (`calculate-departure.use-case.ts` `getTodayDeparture` — 시간 필터 없음),
 * `commute ?? return` 로 고르면 출근 설정이 있는 날에는 퇴근이 영영 선택되지 않는다.
 *
 * 규칙은 백엔드 위젯(`getWidgetDepartureData`)과 같다 — 다음 출발, 전부 지났으면 가장 최근 것.
 * 다만 경계는 `>= now` 가 아니라 자동 종료 임계값을 쓴다. 출발 직후 몇 분은
 * 아직 Activity 를 띄워 둬야 하는 구간이라 `>= now` 로 자르면 조기 전환된다.
 */
export function selectLiveSnapshot(
  data: SmartDepartureTodayResponse,
): SmartDepartureSnapshotDto | null {
  const byDeparture = [data.commute, data.return]
    .filter((snapshot): snapshot is SmartDepartureSnapshotDto => !!snapshot)
    .sort(
      (a, b) =>
        new Date(a.optimalDepartureAt).getTime() -
        new Date(b.optimalDepartureAt).getTime(),
    );

  const live = byDeparture.find(
    (snapshot) =>
      calcMinutesUntil(snapshot.optimalDepartureAt) > -LIVE_ACTIVITY_TIMEOUT_MIN,
  );

  return live ?? byDeparture[byDeparture.length - 1] ?? null;
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
  /** 이 훅이 띄운 Live Activity 의 settingId. 복원된 Activity 는 알 수 없어 null 이다. */
  const startedSettingIdRef = useRef<string | null>(null);

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
    const snapshot = selectLiveSnapshot(data);
    if (!snapshot) return;

    const minutesUntil = calcMinutesUntil(snapshot.optimalDepartureAt);
    const mode: LiveActivityMode =
      snapshot.departureType === 'return' ? 'return' : 'commute';

    // Auto-end: if departure time passed by more than TIMEOUT minutes
    if (minutesUntil < -LIVE_ACTIVITY_TIMEOUT_MIN && liveActivity.isActive) {
      void liveActivity.end();
      liveActivityStartedRef.current = false;
      startedSettingIdRef.current = null;
      return;
    }

    // 선택이 다른 출발로 넘어갔다면 옛 Activity 를 먼저 끊는다.
    // `update` 는 mode 를 바꾸지 않으므로(useLiveActivity 는 start 때만 정한다)
    // 그냥 두면 아래 자동 갱신 분기가 출근 카드를 퇴근 시각으로 덮어쓴다.
    // 복원된 Activity(settingId 미상 = null)는 종전 동작을 그대로 따른다.
    if (
      liveActivity.isActive &&
      startedSettingIdRef.current !== null &&
      startedSettingIdRef.current !== snapshot.settingId
    ) {
      void liveActivity.end();
      liveActivityStartedRef.current = false;
      startedSettingIdRef.current = null;
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
      startedSettingIdRef.current = snapshot.settingId;
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
      startedSettingIdRef.current = null;
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
