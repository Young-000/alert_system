import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiClient, ApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { tokenService } from '@/services/token.service';
import { cleanupPushToken } from '@/hooks/usePushNotifications';

import type { ReactNode } from 'react';
import type { AuthUser, RegisterDto } from '@/types/auth';

type AuthState = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
};

type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
};

export type AuthContextType = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * 저장된 토큰을 버려야 하는 오류인지 판정한다.
 *
 * 서버가 401로 거절한 경우에만 토큰이 못 쓰게 된 것이다.
 * 네트워크 끊김(TypeError)·타임아웃(AbortError)·서버 오류(5xx)는
 * 토큰과 무관하므로 세션을 유지한다 — 여기서 지우면 비행기모드로 앱을 연
 * 사용자가 로그인 화면으로 튕긴다.
 *
 * 401 판정 기준은 `apiClient.handleAuthError`와 같다 (그쪽도 401만 로그아웃 신호로 본다).
 */
function isCredentialRejection(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOut = useRef(false);

  const logout = useCallback(async (): Promise<void> => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      // Remove Expo Push Token from server before clearing auth tokens
      await cleanupPushToken();
      await tokenService.clearAll();
      setUser(null);
    } finally {
      isLoggingOut.current = false;
    }
  }, []);

  // 401 자동 로그아웃 콜백 등록
  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      void logout();
    });
  }, [logout]);

  // 앱 시작 시 저장된 토큰으로 자동 로그인
  useEffect(() => {
    const restoreSession = async (): Promise<void> => {
      try {
        const token = await tokenService.getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const userData = await tokenService.getUserData();
        if (!userData) {
          await tokenService.clearAll();
          setIsLoading(false);
          return;
        }

        const storedUser: AuthUser = {
          id: userData.userId,
          email: userData.email,
          name: userData.name,
          phoneNumber: userData.phoneNumber,
        };

        // 토큰 유효성 검증
        try {
          await authService.getUser(userData.userId);
          setUser(storedUser);
        } catch (err) {
          if (isCredentialRejection(err)) {
            await tokenService.clearAll();
          } else {
            // 오프라인·타임아웃·서버 오류. 토큰이 살아 있을 수 있으므로 세션을 유지한다.
            // 실제로 만료됐다면 다음 요청의 401이 `onUnauthorized`로 로그아웃시킨다.
            setUser(storedUser);
          }
        }
      } catch {
        // SecureStore 접근 불가 등 예외
        await tokenService.clearAll();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await authService.login({ email, password });
    await tokenService.saveAuthData({
      accessToken: response.accessToken,
      userId: response.user.id,
      email: response.user.email,
      name: response.user.name,
      phoneNumber: response.user.phoneNumber,
    });
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterDto): Promise<void> => {
    const response = await authService.register(data);
    await tokenService.saveAuthData({
      accessToken: response.accessToken,
      userId: response.user.id,
      email: response.user.email,
      name: response.user.name,
      phoneNumber: response.user.phoneNumber,
    });
    setUser(response.user);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
