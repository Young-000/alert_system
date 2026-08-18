import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '@infrastructure/api';
import { subscribeToPush, isPushSubscribed, syncPushSubscriptionOwner } from './push-manager';

/**
 * 브라우저 구독과 서버 등록은 **둘 다 성공해야** 알림이 한 통이라도 온다.
 * 브라우저에만 구독이 남으면 `isPushSubscribed()`가 true를 돌려주므로 설정 화면은
 * "켜짐"으로 굳는데, 서버에는 endpoint가 없어 실제로는 아무것도 오지 않는다.
 */

const mockedApiClient = apiClient as unknown as { post: ReturnType<typeof vi.fn> };

/** 구독 객체 하나를 만들고, 그 unsubscribe 스파이를 함께 돌려준다. */
function stubPushEnvironment(): { unsubscribe: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const subscription = {
    endpoint: 'https://push.example.com/sub-1',
    toJSON: () => ({
      endpoint: 'https://push.example.com/sub-1',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    }),
    unsubscribe,
  };

  const subscribe = vi.fn().mockResolvedValue(subscription);

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve({
        pushManager: {
          subscribe,
          getSubscription: vi.fn().mockResolvedValue(subscription),
        },
      }),
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'PushManager', {
    value: function PushManager() {},
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'Notification', {
    value: { requestPermission: vi.fn().mockResolvedValue('granted') },
    writable: true,
    configurable: true,
  });

  return { unsubscribe, subscribe };
}

describe('subscribeToPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('서버 등록에 실패하면 브라우저 구독을 되돌린다', async () => {
    const { unsubscribe } = stubPushEnvironment();
    mockedApiClient.post.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    await expect(subscribeToPush()).rejects.toThrow('500 Internal Server Error');

    // 되돌리지 않으면 다음 방문에 isPushSubscribed()가 true가 되어
    // 화면은 "켜짐"인데 알림은 오지 않는 상태로 굳는다.
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('서버 등록에 실패한 뒤에는 구독된 상태로 남지 않는다', async () => {
    const { unsubscribe } = stubPushEnvironment();
    mockedApiClient.post.mockRejectedValueOnce(new Error('network down'));

    await expect(subscribeToPush()).rejects.toThrow('network down');
    expect(unsubscribe).toHaveBeenCalled();
  });

  // ── 대조군: "무조건 unsubscribe" 오답을 차단한다 ──

  it('서버 등록에 성공하면 구독을 유지한다', async () => {
    const { unsubscribe, subscribe } = stubPushEnvironment();
    mockedApiClient.post.mockResolvedValueOnce({});

    await expect(subscribeToPush()).resolves.toBe(true);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(mockedApiClient.post).toHaveBeenCalledWith('/push/subscribe', {
      endpoint: 'https://push.example.com/sub-1',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
  });

  it('알림 권한이 거부되면 구독을 시도하지 않는다', async () => {
    const { subscribe } = stubPushEnvironment();
    (window.Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    await expect(subscribeToPush()).resolves.toBe(false);

    expect(subscribe).not.toHaveBeenCalled();
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('구독이 있으면 isPushSubscribed가 true를 돌려준다 (되돌림의 의미를 고정)', async () => {
    stubPushEnvironment();
    await expect(isPushSubscribed()).resolves.toBe(true);
  });
});

/**
 * 로그아웃은 브라우저 구독을 지우지 않는다. 서버는 endpoint 하나를 사용자 한 명에게
 * 묶으므로, 소유권을 옮기지 않으면 같은 기기의 다음 사용자가 **이전 사용자의**
 * 출발 시각과 경로를 계속 받는다. 새 사용자 화면은 이미 "켜짐"이라 스스로 풀리지 않는다.
 */
describe('syncPushSubscriptionOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('다른 사용자가 로그인하면 구독을 다시 등록해 소유권을 옮긴다', async () => {
    stubPushEnvironment();
    localStorage.setItem('pushSubscriptionOwnerId', 'user-이전');
    mockedApiClient.post.mockResolvedValueOnce({});

    await expect(syncPushSubscriptionOwner('user-새로운')).resolves.toBe(true);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/push/subscribe', {
      endpoint: 'https://push.example.com/sub-1',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
    expect(localStorage.getItem('pushSubscriptionOwnerId')).toBe('user-새로운');
  });

  it('같은 사용자면 다시 등록하지 않는다 — 앱을 열 때마다 요청을 보내지 않는다', async () => {
    stubPushEnvironment();
    localStorage.setItem('pushSubscriptionOwnerId', 'user-1');

    await expect(syncPushSubscriptionOwner('user-1')).resolves.toBe(false);
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('등록에 실패하면 소유자 표시를 남기지 않아 다음 실행에서 다시 시도한다', async () => {
    stubPushEnvironment();
    localStorage.setItem('pushSubscriptionOwnerId', 'user-이전');
    mockedApiClient.post.mockRejectedValueOnce(new Error('network down'));

    await expect(syncPushSubscriptionOwner('user-새로운')).rejects.toThrow('network down');
    expect(localStorage.getItem('pushSubscriptionOwnerId')).toBe('user-이전');
  });

  it('비로그인 상태에서는 아무 것도 보내지 않는다', async () => {
    stubPushEnvironment();
    await expect(syncPushSubscriptionOwner('')).resolves.toBe(false);
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });
});
