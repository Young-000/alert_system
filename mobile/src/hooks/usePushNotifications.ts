import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

import { pushService } from '@/services/push.service';

const STORED_TOKEN_KEY = 'push_expo_token';
const MAX_REGISTER_RETRIES = 3;

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type UsePushNotificationsOptions = {
  enabled: boolean;
};

type UsePushNotificationsReturn = {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

async function getProjectId(): Promise<string | undefined> {
  return (
    Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  ) ?? Constants.easConfig?.projectId;
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORED_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORED_TOKEN_KEY, token);
  } catch {
    // SecureStore may fail on simulator
  }
}

async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORED_TOKEN_KEY);
  } catch {
    // Ignore errors
  }
}

function isValidExpoToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token);
}

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '출퇴근 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }
}

async function requestAndGetToken(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) {
      console.warn('Push notifications require a physical device');
    }
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  await setupAndroidChannel();

  const projectId = await getProjectId();
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

async function registerTokenWithRetry(token: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt++) {
    try {
      await pushService.registerToken(token);
      return true;
    } catch {
      if (attempt < MAX_REGISTER_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  return false;
}

export function usePushNotifications({
  enabled,
}: UsePushNotificationsOptions): UsePushNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentTokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize push notifications when enabled (user logged in)
  useEffect(() => {
    if (!enabled) {
      isInitializedRef.current = false;
      return;
    }
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initialize = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await requestAndGetToken();
        if (!token || !isValidExpoToken(token)) {
          setIsEnabled(false);
          setIsLoading(false);
          return;
        }

        const storedToken = await getStoredToken();

        // Handle token refresh: remove old token if changed
        if (storedToken && storedToken !== token) {
          try {
            await pushService.removeToken(storedToken);
          } catch {
            // Old token removal is best-effort
          }
        }

        // Register the (possibly new) token
        if (storedToken !== token) {
          const registered = await registerTokenWithRetry(token);
          if (registered) {
            await storeToken(token);
            currentTokenRef.current = token;
            setIsEnabled(true);
          } else {
            setError('푸시 알림 등록에 실패했습니다.');
            setIsEnabled(false);
          }
        } else {
          // Token unchanged, already registered
          currentTokenRef.current = token;
          setIsEnabled(true);
        }
      } catch {
        setError('푸시 알림 설정 중 오류가 발생했습니다.');
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [enabled]);

  // Listen for notification tap (deep link)
  useEffect(() => {
    if (!enabled) return;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;
        const url = data?.url;
        if (url) {
          router.push(url as '/(tabs)');
        }
      },
    );

    return (): void => {
      responseSubscription.remove();
    };
  }, [enabled]);

  // Re-check permissions when app returns to foreground
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isInitializedRef.current) {
        void Notifications.getPermissionsAsync().then(({ status }) => {
          if (status !== 'granted' && isEnabled) {
            setIsEnabled(false);
          }
        });
      }
    });

    return (): void => {
      subscription.remove();
    };
  }, [enabled, isEnabled]);

  // Enable push notifications manually (from settings toggle)
  const enable = useCallback(async (): Promise<void> => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // Check if permissions are already denied
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'denied') {
        setError('시스템 설정에서 알림을 허용해주세요.');
        void Linking.openSettings();
        return;
      }

      const token = await requestAndGetToken();
      if (!token || !isValidExpoToken(token)) {
        setError('시스템 설정에서 알림을 허용해주세요.');
        return;
      }

      const registered = await registerTokenWithRetry(token);
      if (registered) {
        await storeToken(token);
        currentTokenRef.current = token;
        setIsEnabled(true);
      } else {
        setError('푸시 알림 등록에 실패했습니다.');
      }
    } catch {
      setError('푸시 알림 활성화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Disable push notifications manually (from settings toggle)
  const disable = useCallback(async (): Promise<void> => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const tokenToRemove = currentTokenRef.current ?? (await getStoredToken());
      if (tokenToRemove) {
        try {
          await pushService.removeToken(tokenToRemove);
        } catch {
          // Server removal is best-effort
        }
      }
      await clearStoredToken();
      currentTokenRef.current = null;
      setIsEnabled(false);
    } catch {
      setError('푸시 알림 비활성화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return { isEnabled, isLoading, error, enable, disable };
}

/**
 * Cleanup function for logout. Removes the stored Expo token from the server.
 * Call this from AuthContext before clearing tokens.
 */
export async function cleanupPushToken(): Promise<void> {
  try {
    const storedToken = await getStoredToken();
    if (storedToken) {
      await pushService.removeToken(storedToken);
    }
  } catch {
    // Best-effort: JWT may already be expired during logout
  } finally {
    await clearStoredToken();
  }
}
