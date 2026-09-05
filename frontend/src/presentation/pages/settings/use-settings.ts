import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { userApiClient } from '@infrastructure/api';
import type { Alert } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '@infrastructure/push/push-manager';
import { safeRemoveItem } from '@infrastructure/storage/safe-storage';
import { useAuth, notifyAuthChange } from '@presentation/hooks/useAuth';
import { useAlertsQuery } from '@infrastructure/query/use-alerts-query';
import { useRoutesQuery } from '@infrastructure/query/use-routes-query';

export type SettingsTab = 'profile' | 'routes' | 'alerts' | 'places' | 'departure' | 'app';

export const TOAST_DURATION_MS = 3000;

export type PrivacyMessageTone = 'success' | 'error';

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
  loadError: string;
  retryLoad: () => void;

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
  privacyMessageTone: PrivacyMessageTone;

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
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Server state via react-query
  const alertsQuery = useAlertsQuery(userId);
  const routesQuery = useRoutesQuery(userId);

  const alerts = alertsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const isLoading = alertsQuery.isLoading || routesQuery.isLoading;
  // 조회가 실패해도 `?? []`가 빈 배열을 내놓는다. 이걸 그대로 개수로 넘기면 화면이
  // "등록된 경로가 없어요"라고 단언해, 경로가 멀쩡히 있는 사용자에게 지워졌다고 말한다.
  const loadError =
    alertsQuery.isError || routesQuery.isError ? '경로와 알림을 불러오지 못했어요' : '';
  const retryLoad = useCallback(() => {
    void alertsQuery.refetch();
    void routesQuery.refetch();
  }, [alertsQuery, routesQuery]);

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
  const [privacyMessageTone, setPrivacyMessageTone] = useState<PrivacyMessageTone>('success');

  // 예약된 해제 타이머는 그것을 예약한 문구의 것이다. 취소 없이 새 문구를 띄우면
  // 앞선 타이머가 만료되며 **뒤에 뜬 문구**를 지운다. 개인정보 카드의 "내보내기"와
  // "삭제"는 나란히 붙어 같은 privacyMessage 자리에 결과를 쓰므로(AppTab:144),
  // 내보내기 3초 안에 삭제가 실패하면 그 사유가 순식간에 사라져 지워진 것처럼 보인다.
  // actionError(SettingsPage:67)와 privacyMessage는 동시에 보일 수 있어 타이머를 따로 둔다.
  const actionErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const privacyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showActionError = useCallback((message: string): void => {
    if (actionErrorTimerRef.current) clearTimeout(actionErrorTimerRef.current);
    setActionError(message);
    actionErrorTimerRef.current = setTimeout(() => {
      actionErrorTimerRef.current = null;
      setActionError('');
    }, TOAST_DURATION_MS);
  }, []);

  const clearPrivacyMessage = useCallback((): void => {
    if (privacyTimerRef.current) {
      clearTimeout(privacyTimerRef.current);
      privacyTimerRef.current = null;
    }
    setPrivacyMessage('');
  }, []);

  // privacyMessage는 성공과 실패를 같은 자리에 쓰는 유일한 채널이다. 톤을 함께 넘기지
  // 않으면 화면이 둘을 구별할 수 없어 "데이터 삭제에 실패했습니다."가 초록 성공 토스트로
  // 뜬다 — 색이 문구와 반대를 말한다(색만으로 정보를 전달하지 않는다는 a11y 원칙 위반).
  // 같은 화면의 actionError(SettingsPage:67)와 TypeSelectionStep:73이 이미 쓰는 계약
  // (실패 = toast-error + role="alert")에 맞춘다.
  const showPrivacyMessage = useCallback((message: string, tone: PrivacyMessageTone): void => {
    if (privacyTimerRef.current) clearTimeout(privacyTimerRef.current);
    setPrivacyMessage(message);
    setPrivacyMessageTone(tone);
    privacyTimerRef.current = setTimeout(() => {
      privacyTimerRef.current = null;
      setPrivacyMessage('');
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (actionErrorTimerRef.current) clearTimeout(actionErrorTimerRef.current);
    if (privacyTimerRef.current) clearTimeout(privacyTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

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
        // subscribeToPush는 알림 권한을 못 받으면 던지지 않고 false를 돌려준다.
        // 그대로 두면 토글이 꺼진 자리로 돌아갈 뿐 화면에 아무 흔적이 없어,
        // 한 번 차단한 사용자는 눌러도 켜지지 않는 이유도 해제 방법도 알 수 없다.
        // (브라우저는 이미 거부된 사이트에 권한 창을 다시 띄우지 않는다.)
        if (!ok) {
          showActionError('알림 권한이 없어 켜지 못했습니다. 브라우저 설정에서 알림을 허용해주세요.');
        }
      }
    } catch {
      showActionError('푸시 알림 설정에 실패했습니다.');
    } finally {
      setPushLoading(false);
    }
  };

  // Export user data
  const handleExportData = async (): Promise<void> => {
    if (isExporting) return;
    setIsExporting(true);
    clearPrivacyMessage();
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
      showPrivacyMessage('데이터가 다운로드되었습니다.', 'success');
    } catch {
      showPrivacyMessage('데이터 내보내기에 실패했습니다.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete all tracking data
  const handleDeleteAllData = async (): Promise<void> => {
    setIsDeletingAllData(true);
    clearPrivacyMessage();
    try {
      await userApiClient.deleteAllData(userId);
      setShowDeleteAllData(false);
      // 통근 기록·행동 이벤트가 서버에서 사라졌다. 캐시를 그대로 두면 대시보드·리포트·
      // 인사이트가 지운 기록으로 계속 그려진다 — 어떤 화면이 무엇을 캐시했는지 세지 않고
      // 전부 무효화한다(삭제는 드물고, 남는 잔상의 대가가 크다).
      void queryClient.invalidateQueries();
      showPrivacyMessage('추적 데이터가 삭제되었습니다.', 'success');
    } catch {
      showPrivacyMessage('데이터 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeletingAllData(false);
    }
  };

  // Logout
  const handleLogout = (): void => {
    safeRemoveItem('userId');
    safeRemoveItem('accessToken');
    safeRemoveItem('phoneNumber');
    safeRemoveItem('userName');
    safeRemoveItem('userEmail');
    notifyAuthChange();
    navigate('/');
    window.location.reload();
  };

  // Copy user ID
  const handleCopyUserId = (): void => {
    navigator.clipboard.writeText(userId).catch(() => {
      showActionError('복사에 실패했습니다.');
    });
  };

  // Local data reset handler
  const handleLocalDataReset = (): void => {
    safeRemoveItem('commute_stopwatch_records');
    setShowLocalDataReset(false);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setResetSuccess(true);
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      setResetSuccess(false);
    }, TOAST_DURATION_MS);
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
    loadError,
    retryLoad,
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
    privacyMessageTone,
    handleTogglePush,
    handleExportData,
    handleDeleteAllData,
    handleLogout,
    handleCopyUserId,
  };
}
