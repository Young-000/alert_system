import { useState, useEffect } from 'react';

const SEOUL_DEFAULT = { latitude: 37.5665, longitude: 126.978 };
const STORAGE_KEY = 'user-location';
const GEO_TIMEOUT = 5000;
const GEO_MAX_AGE = 300000; // 5 minutes

export interface UserLocation {
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isLoading: boolean;
}

function getCachedLocation(): { latitude: number; longitude: number } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number'
    ) {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    // Invalid cache - ignore
  }
  return null;
}

function cacheLocation(latitude: number, longitude: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude, longitude }));
  } catch {
    // Storage full or unavailable - ignore
  }
}

export function useUserLocation(): UserLocation {
  const cached = getCachedLocation();
  const geoAvailable = typeof navigator !== 'undefined' && !!navigator.geolocation;

  const [location, setLocation] = useState<UserLocation>(() => {
    // If geolocation is unavailable, resolve immediately (no loading needed)
    const isLoading = geoAvailable;

    if (cached) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        isDefault: false,
        isLoading,
      };
    }
    return {
      ...SEOUL_DEFAULT,
      isDefault: true,
      isLoading,
    };
  });

  useEffect(() => {
    if (!geoAvailable) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        cacheLocation(latitude, longitude);
        setLocation({
          latitude,
          longitude,
          isDefault: false,
          isLoading: false,
        });
      },
      () => {
        // Permission denied, timeout, or unavailable
        setLocation((prev) => ({
          ...prev,
          isDefault: prev.isDefault,
          isLoading: false,
        }));
      },
      {
        timeout: GEO_TIMEOUT,
        maximumAge: GEO_MAX_AGE,
      },
    );
  }, [geoAvailable]);

  return location;
}
