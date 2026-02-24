import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApiClient } from '@infrastructure/api';
import type { Alert } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@infrastructure/push/push-manager';
import { useAuth, notifyAuthChange } from '@presentation/hooks/use-auth';
import { useAlertsQuery } from '@infrastructure/query/use-alerts-query';
import { useRoutesQuery } from '@infrastructure/query/use-routes-query';

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
  handleTogglePush: () => Promise<void>;
  handleExportData: () => Promise<void>;
  handleDeleteAllData: () => Promise<void>;
  handleLogout: () => void;
  handleCopyUserId: () => void;
}

export function useSettings(): UseSettingsReturn {
  const navigate = useNavigate();
  const { userId, phoneNumber } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Server state via react-query
  const alertsQuery = useAlertsQuery(userId);
  const routesQuery = useRoutesQuery(userId);

  const alerts = alertsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const isLoading = alertsQuery.isLoading || routesQuery.isLoading;

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

  // Check push notification status
  useEffect(() => {
    isPushSupported().then(setPushSupported);
    isPushSubscribed().then(setPushEnabled);
  }, []);

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

  return {
    userId,
    phoneNumber,
    navigate,
    activeTab,
    setActiveTab,
    alerts,
    routes,
    isLoading,
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
    handleTogglePush,
    handleExportData,
    handleDeleteAllData,
    handleLogout,
    handleCopyUserId,
  };
}
