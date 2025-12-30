import { useEffect, useState } from 'react';
import { PushService } from '@infrastructure/push/push-service';

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<any>(null);
  const pushService = new PushService();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const requestPermission = async () => {
    const result = await pushService.requestPermission();
    setPermission(result);
    return result;
  };

  const subscribe = async () => {
    try {
      const sub = await pushService.subscribe();
      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    try {
      await pushService.unsubscribe();
      setSubscription(null);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

