import { useCallback, useEffect, useRef, useState } from 'react';

import { alertService } from '@/services/alert.service';
import { parseCronTime } from '@/utils/cron';
import { useAuth } from './useAuth';

import type { Alert, CreateAlertPayload, UpdateAlertPayload } from '@/types/alert';

type UseAlertsReturn = {
  alerts: Alert[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createAlert: (payload: Omit<CreateAlertPayload, 'userId'>) => Promise<boolean>;
  updateAlert: (id: string, payload: UpdateAlertPayload) => Promise<boolean>;
  deleteAlert: (id: string) => Promise<boolean>;
  toggleAlert: (id: string) => Promise<boolean>;
};

export function useAlerts(): UseAlertsReturn {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const togglingIds = useRef(new Set<string>());

  const fetchAlerts = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await alertService.fetchAlerts(user.id);
      // Sort by schedule time (ascending). 시각 파싱은 `parseCronTime`에 맡긴다 —
      // 직접 `Number('7,18')`을 쓰면 NaN이 되고, `?? 0`은 NaN을 걸러내지 못해
      // 비교 함수가 NaN을 반환하면서 목록 순서가 통째로 무너진다.
      const scheduleMinutes = (schedule: string): number => {
        const { hour, minute } = parseCronTime(schedule);
        return hour * 60 + minute;
      };
      const sorted = [...data].sort(
        (a, b) => scheduleMinutes(a.schedule) - scheduleMinutes(b.schedule),
      );
      setAlerts(sorted);
      setError(null);
    } catch {
      setError('알림을 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchAlerts().finally(() => setIsLoading(false));
  }, [user, fetchAlerts]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchAlerts();
    setIsRefreshing(false);
  }, [fetchAlerts]);

  // Create
  const createAlert = useCallback(
    async (payload: Omit<CreateAlertPayload, 'userId'>): Promise<boolean> => {
      if (!user) return false;
      setIsSaving(true);
      try {
        await alertService.createAlert({ ...payload, userId: user.id });
        await fetchAlerts();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchAlerts],
  );

  // Update
  const updateAlert = useCallback(
    async (id: string, payload: UpdateAlertPayload): Promise<boolean> => {
      setIsSaving(true);
      try {
        await alertService.updateAlert(id, payload);
        await fetchAlerts();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAlerts],
  );

  // Delete
  const deleteAlert = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await alertService.deleteAlert(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  // Toggle (optimistic update + rollback)
  //
  // 생성·수정·삭제와 같은 계약: 실패하면 boolean으로 알린다.
  // 되돌리기만 하고 조용히 끝내면 스위치가 잠깐 깜빡였다 제자리로 돌아올 뿐이라,
  // 알림을 껐다고 믿은 사용자가 다음 날 아침 그대로 알림을 받는다.
  const toggleAlert = useCallback(
    async (id: string): Promise<boolean> => {
      // 이미 진행 중인 요청이 있으면 중복 탭이다 — 실패가 아니므로 true.
      if (togglingIds.current.has(id)) return true;
      togglingIds.current.add(id);

      // Optimistic UI update
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
      );

      try {
        await alertService.toggleAlert(id);
        return true;
      } catch {
        // Rollback on failure
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        );
        return false;
      } finally {
        togglingIds.current.delete(id);
      }
    },
    [],
  );

  return {
    alerts,
    isLoading,
    isRefreshing,
    error,
    isSaving,
    refresh,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
  };
}
