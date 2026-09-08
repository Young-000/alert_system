import { useCallback, useEffect, useRef, useState } from 'react';

import { alertService } from '@/services/alert.service';
import { serverMessage } from '@/utils/api-error';
import { parseCronTime } from '@/utils/cron';
import { useAuth } from './useAuth';

import type { Alert, CreateAlertPayload, UpdateAlertPayload } from '@/types/alert';

/**
 * 저장 결과. 형제 훅(`useRoutes`·`usePlaces`·`useSmartDeparture`)과 같은 계약이다.
 *
 * 알림 API가 거절하는 사유는 이미 전부 한국어 문장이다 — 검증 실패
 * (`알림 이름은 255자 이하여야 합니다.`·`최소 하나의 알림 타입이 필요합니다.`,
 * `backend/src/application/dto/create-alert.dto.ts`)와 404(`알림을 찾을 수 없습니다.`,
 * `alert.controller.ts`). boolean으로 접으면 그 문장이 화면 앞에서 버려지고
 * "잠시 후 다시 시도해주세요"만 남는데, 404는 다시 시도해도 결과가 같다.
 */
export type SaveAlertResult =
  | { saved: true }
  | { saved: false; message: string };

/** 삭제 결과. 저장(`SaveAlertResult`)과 같은 계약을 따른다. */
export type DeleteAlertResult =
  | { deleted: true }
  | { deleted: false; message: string };

/** 서버가 사유를 안 줬을 때(네트워크 단절 등)의 문구. */
const SAVE_FAILED_FALLBACK = '잠시 후 다시 시도해주세요.';

/** 서버가 사유를 안 줬을 때의 삭제 문구. */
const DELETE_FAILED_FALLBACK = '잠시 후 다시 시도해주세요.';

type UseAlertsReturn = {
  alerts: Alert[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createAlert: (payload: Omit<CreateAlertPayload, 'userId'>) => Promise<SaveAlertResult>;
  updateAlert: (id: string, payload: UpdateAlertPayload) => Promise<SaveAlertResult>;
  deleteAlert: (id: string) => Promise<DeleteAlertResult>;
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
  // 저장 → 재조회는 생성·수정이 똑같이 밟는 순서라 한곳에 모은다.
  // `isSaving`은 재조회까지 끝나야 내린다 — 폼이 닫히기 전에 버튼이 잠깐
  // 다시 눌리는 상태를 만들지 않기 위해서다.
  const saveThenReload = useCallback(
    async (save: () => Promise<unknown>): Promise<SaveAlertResult> => {
      setIsSaving(true);
      try {
        try {
          await save();
        } catch (err) {
          // 서버가 말해준 사유를 그대로 넘긴다. 화면이 추측하지 않도록.
          return { saved: false, message: serverMessage(err) ?? SAVE_FAILED_FALLBACK };
        }
        // 저장은 끝났다. `fetchAlerts`는 실패를 스스로 삼켜 `error`에 남기므로
        // 재조회 실패가 저장 성공 판정을 뒤집지 않는다.
        await fetchAlerts();
        return { saved: true };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAlerts],
  );

  const createAlert = useCallback(
    async (payload: Omit<CreateAlertPayload, 'userId'>): Promise<SaveAlertResult> => {
      if (!user) return { saved: false, message: '로그인이 필요합니다.' };
      return saveThenReload(() => alertService.createAlert({ ...payload, userId: user.id }));
    },
    [user, saveThenReload],
  );

  // Update
  const updateAlert = useCallback(
    async (id: string, payload: UpdateAlertPayload): Promise<SaveAlertResult> =>
      saveThenReload(() => alertService.updateAlert(id, payload)),
    [saveThenReload],
  );

  // Delete
  const deleteAlert = useCallback(
    async (id: string): Promise<DeleteAlertResult> => {
      try {
        await alertService.deleteAlert(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        return { deleted: true };
      } catch (err) {
        // 생성·수정과 같은 계약: 서버가 말해준 사유를 그대로 넘긴다.
        return { deleted: false, message: serverMessage(err) ?? DELETE_FAILED_FALLBACK };
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
