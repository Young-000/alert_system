import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertApiClient, userApiClient } from '@infrastructure/api';
import { getCommuteApiClient, type RouteResponse } from '@infrastructure/api/commute-api.client';
import type { Alert } from '@infrastructure/api';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@infrastructure/push/push-manager';
import { useAuth, notifyAuthChange } from '@presentation/hooks/useAuth';

export type SettingsTab = 'profile' | 'routes' | 'alerts' | 'app';

export const TOAST_DURATION_MS = 3000;

export interface UseSettingsReturn {
  // Auth
  userId: string;
  phoneNumber: string;
  navigate: ReturnType<typeof useNavigate>;

  // Tab state
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;

  // Data
  alerts: Alert[];
  routes: RouteResponse[];
  isLoading: boolean;

  // Delete modal
  deleteModal: { type: 'alert' | 'route'; id: string; name: string } | null;
  setDeleteModal: (modal: { type: 'alert' | 'route'; id: string; name: string } | null) => void;
  isDeleting: boolean;

  // Local data reset
  showLocalDataReset: boolean;
  setShowLocalDataReset: (show: boolean) => void;
  resetSuccess: boolean;
  handleLocalDataReset: () => void;

  // Push
  pushSupported: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;

  // Error
  actionError: string;

  // Privacy
  showDeleteAllData: boolean;
  setShowDeleteAllData: (show: boolean) => void;
  isDeletingAllData: boolean;
  isExporting: boolean;
  privacyMessage: string;

  // Handlers
  handleToggleAlert: (alertId: string) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handleTogglePush: () => Promise<void>;
  handleExportData: () => Promise<void>;
  handleDeleteAllData: () => Promise<void>;
  handleLogout: () => void;
  handleCopyUserId: () => void;

  // Utilities
  formatScheduleTime: (schedule: string) => string;
}

export function useSettings(): UseSettingsReturn {
  const navigate = useNavigate();
  const { userId, phoneNumber } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Data states
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ type: 'alert' | 'route'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local data reset
  const [showLocalDataReset, setShowLocalDataReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Push notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Error feedback
  const [actionError, setActionError] = useState('');

  // Privacy
  const [showDeleteAllData, setShowDeleteAllData] = useState(false);
  const [isDeletingAllData, setIsDeletingAllData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');

  // Stable singleton reference prevents unnecessary useEffect re-runs
  const commuteApi = useMemo(() => getCommuteApiClient(), []);

  // Load data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      setActionError('');
      try {
        const [alertsData, routesData] = await Promise.all([
          alertApiClient.getAlertsByUser(userId).catch(() => []),
          commuteApi.getUserRoutes(userId).catch(() => []),
        ]);
        if (!isMounted) return;
        setAlerts(alertsData);
        setRoutes(routesData);
      } catch {
        if (isMounted) setActionError('데이터를 불러오는 데 실패했습니다.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [userId, commuteApi]);

  // Check push notification status
  useEffect(() => {
    isPushSupported().then(setPushSupported);
    isPushSubscribed().then(setPushEnabled);
  }, []);

  // Toggle alert
  const handleToggleAlert = async (alertId: string): Promise<void> => {
    setActionError('');
    try {
      await alertApiClient.toggleAlert(alertId);
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, enabled: !a.enabled } : a
      ));
    } catch {
      setActionError('알림 상태 변경에 실패했습니다.');
      setTimeout(() => setActionError(''), TOAST_DURATION_MS);
    }
  };

  // Delete handlers
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'alert') {
        await alertApiClient.deleteAlert(deleteModal.id);
        setAlerts(prev => prev.filter(a => a.id !== deleteModal.id));
      } else {
        await commuteApi.deleteRoute(deleteModal.id);
        setRoutes(prev => prev.filter(r => r.id !== deleteModal.id));
      }
      setDeleteModal(null);
    } catch {
      setActionError('삭제에 실패했습니다. 다시 시도해주세요.');
      setTimeout(() => setActionError(''), TOAST_DURATION_MS);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle push notifications
  const handleTogglePush = async (): Promise<void> => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
      }
    } catch {
      setActionError('푸시 알림 설정에 실패했습니다.');
      setTimeout(() => setActionError(''), TOAST_DURATION_MS);
    } finally {
      setPushLoading(false);
    }
  };

  // Export user data
  const handleExportData = async (): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    setPrivacyMessage('');
    try {
      const data = await userApiClient.exportData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPrivacyMessage('데이터가 다운로드되었습니다.');
    } catch {
      setPrivacyMessage('데이터 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setPrivacyMessage(''), TOAST_DURATION_MS);
    }
  };

  // Delete all tracking data
  const handleDeleteAllData = async (): Promise<void> => {
    setIsDeletingAllData(true);
    setPrivacyMessage('');
    try {
      await userApiClient.deleteAllData(userId);
      setShowDeleteAllData(false);
      setPrivacyMessage('추적 데이터가 삭제되었습니다.');
    } catch {
      setPrivacyMessage('데이터 삭제에 실패했습니다.');
    } finally {
      setIsDeletingAllData(false);
      setTimeout(() => setPrivacyMessage(''), TOAST_DURATION_MS);
    }
  };

  // Logout
  const handleLogout = (): void => {
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    notifyAuthChange();
    navigate('/');
    window.location.reload();
  };

  // Copy user ID
  const handleCopyUserId = (): void => {
    navigator.clipboard.writeText(userId).catch(() => {
      setActionError('복사에 실패했습니다.');
      setTimeout(() => setActionError(''), TOAST_DURATION_MS);
    });
  };

  // Local data reset handler
  const handleLocalDataReset = (): void => {
    localStorage.removeItem('commute_stopwatch_records');
    setShowLocalDataReset(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), TOAST_DURATION_MS);
  };

  // Format schedule time
  const formatScheduleTime = (schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length >= 2) {
      const hours = parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`);
      return hours.join(', ');
    }
    return schedule;
  };

  return {
    userId,
    phoneNumber,
    navigate,
    activeTab,
    setActiveTab,
    alerts,
    routes,
    isLoading,
    deleteModal,
    setDeleteModal,
    isDeleting,
    showLocalDataReset,
    setShowLocalDataReset,
    resetSuccess,
    handleLocalDataReset,
    pushSupported,
    pushEnabled,
    pushLoading,
    actionError,
    showDeleteAllData,
    setShowDeleteAllData,
    isDeletingAllData,
    isExporting,
    privacyMessage,
    handleToggleAlert,
    handleDeleteConfirm,
    handleTogglePush,
    handleExportData,
    handleDeleteAllData,
    handleLogout,
    handleCopyUserId,
    formatScheduleTime,
  };
}
