import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiClient } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { tokenService } from '@/services/token.service';

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

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOut = useRef(false);

  const logout = useCallback(async (): Promise<void> => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
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

        // 토큰 유효성 검증
        try {
          await authService.getUser(userData.userId);
          setUser({
            id: userData.userId,
            email: userData.email,
            name: userData.name,
            phoneNumber: userData.phoneNumber,
          });
        } catch {
          // 토큰 만료 또는 유효하지 않음
          await tokenService.clearAll();
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
