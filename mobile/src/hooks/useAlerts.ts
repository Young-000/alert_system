import { useCallback, useEffect, useRef, useState } from 'react';

import { alertService } from '@/services/alert.service';
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
  toggleAlert: (id: string) => void;
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
      // Sort by schedule time (ascending)
      const sorted = [...data].sort((a, b) => {
        const [aMin, aHour] = a.schedule.split(' ').map(Number);
        const [bMin, bHour] = b.schedule.split(' ').map(Number);
        const aTime = (aHour ?? 0) * 60 + (aMin ?? 0);
        const bTime = (bHour ?? 0) * 60 + (bMin ?? 0);
        return aTime - bTime;
      });
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
  const toggleAlert = useCallback(
    (id: string): void => {
      // Prevent duplicate toggle
      if (togglingIds.current.has(id)) return;
      togglingIds.current.add(id);

      // Optimistic UI update
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
      );

      alertService
        .toggleAlert(id)
        .catch(() => {
          // Rollback on failure
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, enabled: !a.enabled } : a,
            ),
          );
        })
        .finally(() => {
          togglingIds.current.delete(id);
        });
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
