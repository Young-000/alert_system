import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  alertApiClient,
} from '@infrastructure/api';
import type { Alert, AlertType, CreateAlertDto } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';
import { TOAST_DURATION_MS } from './types';

interface AlertCrudState {
  alerts: Alert[];
  isLoadingAlerts: boolean;
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Alert | null>(null);
  const [editForm, setEditForm] = useState({ name: '', schedule: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<RouteResponse[]>([]);
  const [duplicateAlert, setDuplicateAlert] = useState<Alert | null>(null);

  const commuteApi = useMemo(() => getCommuteApiClient(), []);

  // Load existing alerts
  useEffect(() => {
    if (!userId) {
      setIsLoadingAlerts(false);
      return;
    }

    let isMounted = true;
    setIsLoadingAlerts(true);

    const fetchAlerts = async (): Promise<void> => {
      try {
        const userAlerts = await alertApiClient.getAlertsByUser(userId);
        if (!isMounted) return;
        setAlerts(userAlerts);
      } catch {
        if (!isMounted) return;
        setError('알림 목록을 불러오는데 실패했습니다.');
      } finally {
        if (isMounted) {
          setIsLoadingAlerts(false);
        }
      }
    };

    fetchAlerts();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load saved routes
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    commuteApi.getUserRoutes(userId).then((routes) => {
      if (isMounted) setSavedRoutes(routes);
    }).catch(() => {
      if (isMounted) setError('저장된 경로를 불러올 수 없습니다');
    });

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  const reloadAlerts = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const userAlerts = await alertApiClient.getAlertsByUser(userId);
      setAlerts(userAlerts);
    } catch {
      // Reload failure is non-critical; log for observability
      console.warn('Failed to reload alerts after operation');
    }
  }, [userId]);

  const normalizeSchedule = useCallback((schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length < 5) return schedule;
    const minute = parts[0];
    const hours = parts[1].split(',').map(h => parseInt(h, 10)).filter(h => !isNaN(h)).sort((a, b) => a - b);
    return `${minute} ${hours.join(',')} ${parts.slice(2).join(' ')}`;
  }, []);

  const checkDuplicateAlert = useCallback((schedule: string, alertTypes: AlertType[]): Alert | null => {
    const normalizedNew = normalizeSchedule(schedule);
    const newTypes = [...alertTypes].sort();

    return alerts.find(existing => {
      const normalizedExisting = normalizeSchedule(existing.schedule);
      if (normalizedNew !== normalizedExisting) return false;

      const existingTypes = [...existing.alertTypes].sort();
      const sameTypes = existingTypes.length === newTypes.length &&
        existingTypes.every((t, i) => t === newTypes[i]);

      return sameTypes;
    }) || null;
  }, [alerts, normalizeSchedule]);

  const handleDeleteClick = (alert: Alert): void => {
    setDeleteTarget({ id: alert.id, name: alert.name });
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await alertApiClient.deleteAlert(deleteTarget.id);
      reloadAlerts();
      setDeleteTarget(null);
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = useCallback((): void => {
    setDeleteTarget(null);
  }, []);

  const handleEditClick = (alert: Alert): void => {
    setEditTarget(alert);
    const parts = alert.schedule.split(' ');
    let time = '07:00';
    if (parts.length >= 2) {
      const minute = parts[0].padStart(2, '0');
      const hour = parts[1].split(',')[0].padStart(2, '0');
      time = `${hour}:${minute}`;
    }
    setEditForm({ name: alert.name, schedule: time });
  };

  const handleEditConfirm = async (): Promise<void> => {
    if (!editTarget) return;
    setIsEditing(true);
    try {
      const [hour, minute] = editForm.schedule.split(':');
      const cronSchedule = `${parseInt(minute, 10) || 0} ${parseInt(hour, 10) || 0} * * *`;

      await alertApiClient.updateAlert(editTarget.id, {
        name: editForm.name,
        schedule: cronSchedule,
      });
      reloadAlerts();
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
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a));
    try {
      await alertApiClient.toggleAlert(alert.id);
    } catch {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a));
      setError('알림 상태 변경에 실패했습니다.');
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
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('권한이 없습니다. 다시 로그인해주세요.');
      } else {
        setError(`알림 생성에 실패했습니다: ${errorMessage}`);
      }
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
