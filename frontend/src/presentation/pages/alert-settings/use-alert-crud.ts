import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  alertApiClient,
} from '@infrastructure/api';
import type { Alert, AlertType, CreateAlertDto } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import { useAlertsQuery } from '@infrastructure/query/use-alerts-query';
import { useRoutesQuery } from '@infrastructure/query/use-routes-query';
import { queryKeys } from '@infrastructure/query/query-keys';
import { getApiErrorMessage } from '@infrastructure/query/error-utils';
import {
  cronToTimeInput,
  applyTimeToCron,
  normalizeCronForComparison,
} from './cron-utils';
import { TOAST_DURATION_MS } from './types';

interface AlertCrudState {
  alerts: Alert[];
  isLoadingAlerts: boolean;
  loadError: string;
  error: string;
  success: string;
  deleteTarget: { id: string; name: string } | null;
  isDeleting: boolean;
  isSubmitting: boolean;
  editTarget: Alert | null;
  editForm: { name: string; schedule: string };
  isEditing: boolean;
  savedRoutes: RouteResponse[];
  duplicateAlert: Alert | null;
}

interface AlertCrudActions {
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  setIsSubmitting: (value: boolean) => void;
  setDuplicateAlert: (alert: Alert | null) => void;
  retryLoad: () => void;
  reloadAlerts: () => Promise<void>;
  handleDeleteClick: (alert: Alert) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleDeleteCancel: () => void;
  handleEditClick: (alert: Alert) => void;
  handleEditConfirm: () => Promise<void>;
  handleEditCancel: () => void;
  setEditForm: (form: { name: string; schedule: string }) => void;
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  handleToggleAlert: (alert: Alert) => Promise<void>;
  handleQuickWeatherAlert: () => Promise<void>;
  checkDuplicateAlert: (schedule: string, alertTypes: AlertType[]) => Alert | null;
}

export function useAlertCrud(userId: string): AlertCrudState & AlertCrudActions {
  const queryClient = useQueryClient();

  // Server state via react-query
  const alertsQuery = useAlertsQuery(userId);
  const routesQuery = useRoutesQuery(userId);

  // Local alerts state for optimistic mutations (synced from query)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const isLoadingAlerts = alertsQuery.isLoading;
  const loadError = alertsQuery.isError ? '알림 목록을 불러올 수 없습니다' : '';
  const savedRoutes = routesQuery.data ?? [];

  const retryLoad = useCallback(() => {
    void alertsQuery.refetch();
    void routesQuery.refetch();
  }, [alertsQuery, routesQuery]);

  // Sync query data to local state when query data changes
  useEffect(() => {
    if (alertsQuery.data) {
      setAlerts(alertsQuery.data);
    }
  }, [alertsQuery.data]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Alert | null>(null);
  const [editForm, setEditForm] = useState({ name: '', schedule: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<Alert | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const reloadAlerts = useCallback(async (): Promise<void> => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.alerts.byUser(userId) });
  }, [userId, queryClient]);

  const checkDuplicateAlert = useCallback((schedule: string, alertTypes: AlertType[]): Alert | null => {
    const normalizedNew = normalizeCronForComparison(schedule);
    const newTypes = [...alertTypes].sort();

    return alerts.find(existing => {
      const normalizedExisting = normalizeCronForComparison(existing.schedule);
      if (normalizedNew !== normalizedExisting) return false;

      const existingTypes = [...existing.alertTypes].sort();
      const sameTypes = existingTypes.length === newTypes.length &&
        existingTypes.every((t, i) => t === newTypes[i]);

      return sameTypes;
    }) || null;
  }, [alerts]);

  const handleDeleteClick = (alert: Alert): void => {
    // 다른 작업(토글·수정·이전 삭제)에서 남은 공유 error가 삭제 모달에 새어 나오는 것 방지
    setError('');
    setDeleteTarget({ id: alert.id, name: alert.name });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await alertApiClient.deleteAlert(deleteTarget.id);
      await reloadAlerts();
      setDeleteTarget(null);
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = useCallback((): void => {
    setError('');
    setDeleteTarget(null);
  }, []);

  const handleEditClick = (alert: Alert): void => {
    setEditTarget(alert);
    setEditForm({ name: alert.name, schedule: cronToTimeInput(alert.schedule) });
  };

  const handleEditConfirm = async (): Promise<void> => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      // 모달은 첫 시각만 보여주므로, 나머지 시각(예: 퇴근 알림)은 그대로 보존해야 한다.
      const cronSchedule = applyTimeToCron(editTarget.schedule, editForm.schedule);

      await alertApiClient.updateAlert(editTarget.id, {
        name: editForm.name,
        schedule: cronSchedule,
      });
      await reloadAlerts();
      setEditTarget(null);
      setSuccess('알림이 수정되었습니다.');
      setTimeout(() => setSuccess(''), TOAST_DURATION_MS);
    } catch {
      setError('수정에 실패했습니다.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditCancel = useCallback((): void => {
    setEditTarget(null);
  }, []);

  const handleToggleAlert = async (alert: Alert): Promise<void> => {
    if (togglingIds.has(alert.id)) return;
    setTogglingIds(prev => new Set(prev).add(alert.id));
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a));
    try {
      await alertApiClient.toggleAlert(alert.id);
      // 낙관적 변경은 로컬 state에만 남는다. 캐시를 그대로 두면 staleTime(2분) 안에
      // 이 화면을 다시 열었을 때 옛 enabled 값이 그려져 껐던 알림이 켜진 것처럼 보인다.
      await reloadAlerts();
    } catch {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a));
      setError('알림 상태 변경에 실패했습니다.');
      setTimeout(() => setError(''), TOAST_DURATION_MS);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  const handleQuickWeatherAlert = useCallback(async (): Promise<void> => {
    setError('');
    setSuccess('');

    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    const existingAlert = alerts.find(a => a.name === '아침 날씨 알림');
    if (existingAlert) {
      setError('이미 아침 날씨 알림이 설정되어 있습니다.');
      setTimeout(() => {
        const alertsSection = document.querySelector('.existing-alerts');
        alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreateAlertDto = {
        userId,
        name: '아침 날씨 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather', 'airQuality'],
      };

      await alertApiClient.createAlert(dto);
      setSuccess('날씨 알림이 설정되었습니다!');
      await reloadAlerts();

      setTimeout(() => {
        const alertsSection = document.querySelector('.existing-alerts');
        alertsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '알림 생성에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, alerts, reloadAlerts]);

  // ESC key to close delete modal
  useEffect(() => {
    if (!deleteTarget) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleDeleteCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget, handleDeleteCancel]);

  return {
    alerts,
    isLoadingAlerts,
    loadError,
    error,
    success,
    deleteTarget,
    isDeleting,
    isSubmitting,
    editTarget,
    editForm,
    isEditing,
    savedRoutes,
    duplicateAlert,
    setError,
    setSuccess,
    setIsSubmitting,
    setDuplicateAlert,
    retryLoad,
    reloadAlerts,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleEditClick,
    handleEditConfirm,
    handleEditCancel,
    setEditForm,
    setAlerts,
    handleToggleAlert,
    handleQuickWeatherAlert,
    checkDuplicateAlert,
  };
}
