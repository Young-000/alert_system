import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CredentialStorageError, tokenService } from './token.service';

import { toUserMessage } from '@/services/auth.service';

/**
 * SecureStore를 메모리 Map으로 대체하고, 특정 키에서 던지게 만들 수 있게 한다.
 * `vi.mock`은 import보다 먼저 끌어올려지므로 팩토리가 참조할 값은
 * `vi.hoisted`로 같이 올린다.
 */
const { store, failOnKey } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  failOnKey: { current: null as string | null },
}));

vi.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (failOnKey.current === key) {
      throw new Error('SecureStore unavailable');
    }
    store.set(key, value);
  },
  getItemAsync: async (key: string): Promise<string | null> => store.get(key) ?? null,
  deleteItemAsync: async (key: string): Promise<void> => {
    store.delete(key);
  },
}));

// 위젯 동기화는 네이티브 모듈을 탄다. 여기서 보는 건 자격증명 저장 계약뿐이다.
vi.mock('./widget-sync.service', () => ({
  widgetSyncService: {
    syncAuthToken: vi.fn(async () => undefined),
    clearAuthToken: vi.fn(async () => undefined),
    clearWidgetData: vi.fn(async () => undefined),
  },
}));

const AUTH_DATA = {
  accessToken: 'token-1',
  userId: 'user-1',
  email: 'a@b.com',
  name: '홍길동',
  phoneNumber: '01012345678',
};

describe('tokenService.saveAuthData — 자격증명 저장 실패 계약', () => {
  beforeEach(() => {
    store.clear();
    failOnKey.current = null;
  });

  it('정상 저장 시 토큰과 사용자 정보를 모두 읽을 수 있다 (대조군)', async () => {
    await tokenService.saveAuthData(AUTH_DATA);

    expect(await tokenService.getAccessToken()).toBe('token-1');
    expect(await tokenService.getUserData()).toEqual({
      userId: 'user-1',
      email: 'a@b.com',
      name: '홍길동',
      phoneNumber: '01012345678',
    });
  });

  it('저장이 중간에 실패하면 CredentialStorageError를 던진다', async () => {
    failOnKey.current = 'userEmail';

    await expect(tokenService.saveAuthData(AUTH_DATA)).rejects.toBeInstanceOf(
      CredentialStorageError,
    );
  });

  it('저장이 중간에 실패하면 반쯤 쓰인 자격증명을 남기지 않는다', async () => {
    failOnKey.current = 'userEmail';

    await expect(tokenService.saveAuthData(AUTH_DATA)).rejects.toThrow();

    // 토큰만 남으면 다음 실행에서 이름·연락처가 빈 세션이 복원된다.
    expect(await tokenService.getAccessToken()).toBeNull();
    expect(await tokenService.getUserData()).toBeNull();
  });

  it('로그인 화면이 "오류가 발생했습니다" 대신 사유와 다음 행동을 말한다', () => {
    const message = toUserMessage(new CredentialStorageError());

    expect(message).not.toBe('오류가 발생했습니다.');
    expect(message).toContain('로그인 정보를 저장할 수 없어요');
  });
});
