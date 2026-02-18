import * as SecureStore from 'expo-secure-store';
import { widgetSyncService } from './widget-sync.service';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  USER_NAME: 'userName',
  PHONE_NUMBER: 'phoneNumber',
} as const;

export const tokenService = {
  /** 로그인 성공 시 토큰 + 사용자 정보 저장 */
  async saveAuthData(data: {
    accessToken: string;
    userId: string;
    email: string;
    name: string;
    phoneNumber: string;
  }): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, data.accessToken);
    await SecureStore.setItemAsync(KEYS.USER_ID, data.userId);
    await SecureStore.setItemAsync(KEYS.USER_EMAIL, data.email);
    await SecureStore.setItemAsync(KEYS.USER_NAME, data.name);
    await SecureStore.setItemAsync(KEYS.PHONE_NUMBER, data.phoneNumber);

    // Sync auth token to shared Keychain for widget extension
    void widgetSyncService.syncAuthToken(data.accessToken);
  },

  /** 저장된 토큰 가져오기 */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  /** 저장된 사용자 정보 가져오기 */
  async getUserData(): Promise<{
    userId: string;
    email: string;
    name: string;
    phoneNumber: string;
  } | null> {
    try {
      const userId = await SecureStore.getItemAsync(KEYS.USER_ID);
      if (!userId) return null;
      return {
        userId,
        email: (await SecureStore.getItemAsync(KEYS.USER_EMAIL)) ?? '',
        name: (await SecureStore.getItemAsync(KEYS.USER_NAME)) ?? '',
        phoneNumber: (await SecureStore.getItemAsync(KEYS.PHONE_NUMBER)) ?? '',
      };
    } catch {
      return null;
    }
  },

  /** 로그아웃 시 모든 데이터 삭제 */
  async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(KEYS).map((key) =>
        SecureStore.deleteItemAsync(key).catch(() => {
          // SecureStore 접근 불가 시 무시 (시뮬레이터 제한)
        }),
      ),
    );

    // Clear shared Keychain token and widget data for widget extension
    void widgetSyncService.clearAuthToken();
    void widgetSyncService.clearWidgetData();
  },
};
