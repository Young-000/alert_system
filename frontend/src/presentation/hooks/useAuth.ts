import { useSyncExternalStore } from 'react';
import { safeGetItem } from '@infrastructure/storage/safe-storage';

interface AuthState {
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  isLoggedIn: boolean;
}

const AUTH_KEYS = ['userId', 'userName', 'userEmail', 'accessToken', 'phoneNumber'] as const;

let listeners: Array<() => void> = [];

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// 구분자로 이어붙이면 값 안의 구분자가 필드를 밀어낸다.
// 이름은 사용자가 정하므로 JSON으로 인코딩해 경계를 값과 분리한다.
const EMPTY_SNAPSHOT = JSON.stringify(AUTH_KEYS.map(() => ''));

function getSnapshot(): string {
  return JSON.stringify(AUTH_KEYS.map((k) => safeGetItem(k) ?? ''));
}

function getServerSnapshot(): string {
  return EMPTY_SNAPSHOT;
}

// storage 이벤트로 다른 탭의 변경도 감지
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && AUTH_KEYS.includes(e.key as (typeof AUTH_KEYS)[number])) {
      emitChange();
    }
  });
}

/**
 * localStorage 기반 인증 상태를 반응적으로 읽는 훅.
 * 로그인/로그아웃 시 notifyAuthChange()를 호출하면 구독 컴포넌트가 리렌더링됩니다.
 */
export function useAuth(): AuthState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // accessToken(4번째)은 컴포넌트에 노출하지 않는다.
  const [storedId, storedName, storedEmail, , storedPhone] = JSON.parse(raw) as string[];
  const userId = storedId || '';
  const userName = storedName || '회원';
  const userEmail = storedEmail || '';
  const phoneNumber = storedPhone || '';

  return {
    userId,
    userName,
    userEmail,
    phoneNumber,
    isLoggedIn: !!userId,
  };
}

/** 인증 상태 변경 후 호출 — 구독 컴포넌트를 리렌더링합니다. */
export function notifyAuthChange(): void {
  emitChange();
}
