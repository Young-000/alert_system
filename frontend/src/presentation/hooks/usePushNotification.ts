import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  PushService,
  PushSubscriptionData,
} from '@infrastructure/push/push-service';

interface UsePushNotificationResult {
  permission: NotificationPermission;
  subscription: PushSubscriptionData | null;
  isSwReady: boolean;
  swError: string | null;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<PushSubscriptionData | null>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotification(): UsePushNotificationResult {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null,
  );
  const [isSwReady, setIsSwReady] = useState(false);
  const [swError, setSwError] = useState<string | null>(null);

  const pushService = useMemo(() => new PushService(), []);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          setIsSwReady(true);
        })
        .catch((error) => {
          console.error('Service Worker 등록 실패:', error);
          setSwError('서비스 워커 등록에 실패했습니다. 푸시 알림을 사용할 수 없습니다.');
          setIsSwReady(false);
        });
    } else {
      setSwError('이 브라우저는 서비스 워커를 지원하지 않습니다.');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await pushService.requestPermission();
    setPermission(result);
    return result;
  }, [pushService]);

  const subscribe = useCallback(async () => {
    try {
      const sub = await pushService.subscribe();
      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('푸시 구독 실패:', error);
      throw error;
    }
  }, [pushService]);

  const unsubscribe = useCallback(async () => {
    try {
      await pushService.unsubscribe();
      setSubscription(null);
    } catch (error) {
      console.error('푸시 구독 해제 실패:', error);
      throw error;
    }
  }, [pushService]);

  return {
    permission,
    subscription,
    isSwReady,
    swError,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
