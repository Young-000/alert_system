import { renderHook } from '@testing-library/react';
import { useUserLocation } from './useUserLocation';

const STORAGE_KEY = 'user-location';
const SEOUL_DEFAULT = { latitude: 37.5665, longitude: 126.978 };

describe('useUserLocation', () => {
  let originalGeolocation: Geolocation;
  let mockGetCurrentPosition: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    originalGeolocation = navigator.geolocation;
    mockGetCurrentPosition = jest.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it('should return Seoul defaults when geolocation is not available', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.latitude).toBe(SEOUL_DEFAULT.latitude);
    expect(result.current.longitude).toBe(SEOUL_DEFAULT.longitude);
    expect(result.current.isDefault).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should use cached location from localStorage on mount', () => {
    const cached = { latitude: 37.3945, longitude: 127.1110 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.latitude).toBe(cached.latitude);
    expect(result.current.longitude).toBe(cached.longitude);
    expect(result.current.isDefault).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('should update location on geolocation success', () => {
    const coords = { latitude: 35.1796, longitude: 129.0756 };
    mockGetCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords } as GeolocationPosition);
    });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.latitude).toBe(coords.latitude);
    expect(result.current.longitude).toBe(coords.longitude);
    expect(result.current.isDefault).toBe(false);
    expect(result.current.isLoading).toBe(false);

    // Check that it was cached
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.latitude).toBe(coords.latitude);
    expect(stored.longitude).toBe(coords.longitude);
  });

  it('should keep Seoul defaults when geolocation fails and no cache', () => {
    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          message: 'User denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    );

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.latitude).toBe(SEOUL_DEFAULT.latitude);
    expect(result.current.longitude).toBe(SEOUL_DEFAULT.longitude);
    expect(result.current.isDefault).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should keep cached location when geolocation fails', () => {
    const cached = { latitude: 37.3945, longitude: 127.1110 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));

    mockGetCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 3,
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    );

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.latitude).toBe(cached.latitude);
    expect(result.current.longitude).toBe(cached.longitude);
    expect(result.current.isDefault).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should call getCurrentPosition with correct options', () => {
    mockGetCurrentPosition.mockImplementation(() => {
      // Do nothing - keep loading
    });

    renderHook(() => useUserLocation());

    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { timeout: 5000, maximumAge: 300000 },
    );
  });
});
