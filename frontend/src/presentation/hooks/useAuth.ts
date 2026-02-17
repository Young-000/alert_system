import { useSyncExternalStore } from 'react';

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

function getSnapshot(): string {
  return AUTH_KEYS.map((k) => localStorage.getItem(k) ?? '').join('|');
}

function getServerSnapshot(): string {
  return '||||';
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
  const parts = raw.split('|');
  const userId = parts[0] || '';
  const userName = parts[1] || '회원';
  const userEmail = parts[2] || '';
  // parts[3] is accessToken -- skip (not exposed to components)
  const phoneNumber = parts[4] || '';

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
