import { apiClient } from '@infrastructure/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY);
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!await isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!await isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  });

  const subJson = sub.toJSON();

  // 브라우저 구독과 서버 등록은 둘 다 성공해야 알림이 한 통이라도 온다.
  // 서버 등록만 실패했을 때 브라우저 구독을 남겨두면, 다음 방문에
  // isPushSubscribed()가 true를 돌려줘 설정 화면은 "켜짐"으로 굳는데
  // 서버에는 endpoint가 없어 실제로는 아무것도 오지 않는다.
  // 되돌려서 화면과 실제 상태를 맞추고, 실패는 그대로 호출부에 알린다.
  try {
    await apiClient.post('/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      },
    });
  } catch (error) {
    await sub.unsubscribe().catch(() => undefined);
    throw error;
  }

  return true;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!await isPushSupported()) return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  try {
    await apiClient.post('/push/unsubscribe', { endpoint });
  } catch {
    // Subscription already removed from browser - ok
  }

  return true;
}
