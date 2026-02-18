import { useCallback, useEffect, useRef, useState } from 'react';

import { smartDepartureService } from '@/services/smart-departure.service';
import { useAuth } from './useAuth';

import type {
  SmartDepartureSnapshotDto,
  SmartDepartureTodayResponse,
} from '@/types/smart-departure';

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

function calcMinutesUntil(isoDatetime: string): number {
  const targetMs = new Date(isoDatetime).getTime();
  const nowMs = Date.now();
  return Math.round((targetMs - nowMs) / 60_000);
}

export function useSmartDepartureToday(): UseSmartDepartureTodayReturn {
  const { user } = useAuth();
  const [data, setData] = useState<SmartDepartureTodayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commuteMinutes, setCommuteMinutes] = useState<number | null>(null);
  const [returnMinutes, setReturnMinutes] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
