import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

type PermissionStatus = 'undetermined' | 'foreground_only' | 'always' | 'denied';

type UseLocationPermissionReturn = {
  status: PermissionStatus;
  isLoading: boolean;
  requestForeground: () => Promise<boolean>;
  requestBackground: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  refresh: () => Promise<void>;
};

function resolveStatus(
  foreground: Location.PermissionStatus | null,
  background: Location.PermissionStatus | null,
): PermissionStatus {
  if (!foreground || foreground === Location.PermissionStatus.UNDETERMINED) {
    return 'undetermined';
  }
  if (foreground === Location.PermissionStatus.DENIED) {
    return 'denied';
  }
  // Foreground granted
  if (background === Location.PermissionStatus.GRANTED) {
    return 'always';
  }
  return 'foreground_only';
}

export function useLocationPermission(): UseLocationPermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = useCallback(async (): Promise<void> => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      setStatus(resolveStatus(fg.status, bg.status));
    } catch {
      setStatus('denied');
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    setIsLoading(true);
    void checkPermissions().finally(() => setIsLoading(false));
  }, [checkPermissions]);

  // Recheck when app comes back to foreground (user may have changed settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkPermissions();
      }
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  const requestForeground = useCallback(async (): Promise<boolean> => {
    const result = await Location.requestForegroundPermissionsAsync();
    await checkPermissions();
    return result.status === Location.PermissionStatus.GRANTED;
  }, [checkPermissions]);

  const requestBackground = useCallback(async (): Promise<boolean> => {
    // Must have foreground permission first
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== Location.PermissionStatus.GRANTED) {
      const fgResult = await Location.requestForegroundPermissionsAsync();
      if (fgResult.status !== Location.PermissionStatus.GRANTED) {
        await checkPermissions();
        return false;
      }
    }

    // On Android 11+, background permission is directed to settings
    // On iOS, the system may only show "While Using" initially
    const result = await Location.requestBackgroundPermissionsAsync();
    await checkPermissions();
    return result.status === Location.PermissionStatus.GRANTED;
  }, [checkPermissions]);

  const openSettings = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await checkPermissions();
  }, [checkPermissions]);

  return {
    status,
    isLoading,
    requestForeground,
    requestBackground,
    openSettings,
    refresh,
  };
}
