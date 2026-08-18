import { apiClient } from '@infrastructure/api';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@infrastructure/storage/safe-storage';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** 이 브라우저의 구독이 현재 어느 사용자에게 묶여 있는지. 서버 상태의 로컬 사본이다. */
const SUBSCRIPTION_OWNER_KEY = 'pushSubscriptionOwnerId';

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

  safeSetItem(SUBSCRIPTION_OWNER_KEY, safeGetItem('userId') ?? '');
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

  safeRemoveItem(SUBSCRIPTION_OWNER_KEY);
  return true;
}

/**
 * 서버는 endpoint 하나를 사용자 한 명에게 묶는다 — `/push/subscribe`가 같은 endpoint의
 * 기존 행을 찾으면 userId를 **호출자로 덮어쓴다**(push.controller.ts).
 *
 * 그런데 로그아웃은 브라우저 구독을 지우지 않는다. 그래서 같은 기기에 다른 사용자가
 * 로그인하면 그 기기로 오는 푸시는 여전히 **이전 사용자**의 출발 시각과 경로다.
 * 새 사용자 화면은 `isPushSubscribed()`가 true라 "켜짐"으로 보이고, 다시 구독할 일이
 * 없으니 스스로 풀리지도 않는다.
 *
 * 로그인한 사용자가 바뀌었을 때 구독을 한 번 다시 보내 소유권을 옮긴다.
 * 로그아웃 경로를 건드리지 않으므로 오프라인 로그아웃은 그대로 유지된다.
 * 실패하면 소유자 표시를 남기지 않아 다음 실행에서 다시 시도한다.
 */
export async function syncPushSubscriptionOwner(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (!await isPushSupported()) return false;
  if (safeGetItem(SUBSCRIPTION_OWNER_KEY) === userId) return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  const subJson = sub.toJSON();
  await apiClient.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    },
  });

  safeSetItem(SUBSCRIPTION_OWNER_KEY, userId);
  return true;
}
