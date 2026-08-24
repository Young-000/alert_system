import { useCallback, useEffect, useRef, useState } from 'react';

import { placeService } from '@/services/place.service';
import { useAuth } from './useAuth';

import type { CreatePlaceDto, Place, UpdatePlaceDto } from '@/types/place';

type UsePlacesReturn = {
  places: Place[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createPlace: (dto: CreatePlaceDto) => Promise<boolean>;
  updatePlace: (id: string, dto: UpdatePlaceDto) => Promise<boolean>;
  deletePlace: (id: string) => Promise<boolean>;
  togglePlace: (id: string) => Promise<boolean>;
  getPlaceByType: (type: 'home' | 'work') => Place | undefined;
};

export function usePlaces(): UsePlacesReturn {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const togglingIds = useRef(new Set<string>());

  const fetchPlaces = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await placeService.fetchPlaces();
      setPlaces(data);
      setError(null);
    } catch {
      setError('장소를 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchPlaces().finally(() => setIsLoading(false));
  }, [user, fetchPlaces]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchPlaces();
    setIsRefreshing(false);
  }, [fetchPlaces]);

  // Create
  const createPlace = useCallback(
    async (dto: CreatePlaceDto): Promise<boolean> => {
      if (!user) return false;
      setIsSaving(true);
      try {
        await placeService.createPlace(dto);
        await fetchPlaces();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchPlaces],
  );

  // Update
  const updatePlace = useCallback(
    async (id: string, dto: UpdatePlaceDto): Promise<boolean> => {
      setIsSaving(true);
      try {
        await placeService.updatePlace(id, dto);
        await fetchPlaces();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchPlaces],
  );

  // Delete (optimistic)
  const deletePlace = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = places;
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      try {
        await placeService.deletePlace(id);
        return true;
      } catch {
        setPlaces(previous);
        return false;
      }
    },
    [places],
  );

  // Toggle active (optimistic + rollback)
  //
  // 생성·수정·삭제와 같은 계약: 실패하면 boolean으로 알린다.
  // 되돌리기만 하고 끝내면 껐다고 믿은 장소가 계속 지오펜스 대상으로 남는다.
  const togglePlace = useCallback(
    async (id: string): Promise<boolean> => {
      // 이미 진행 중인 요청이 있으면 중복 탭이다 — 실패가 아니므로 true.
      if (togglingIds.current.has(id)) return true;
      togglingIds.current.add(id);

      setPlaces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
      );

      try {
        await placeService.togglePlace(id);
        return true;
      } catch {
        setPlaces((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
        );
        return false;
      } finally {
        togglingIds.current.delete(id);
      }
    },
    [],
  );

  const getPlaceByType = useCallback(
    (type: 'home' | 'work'): Place | undefined => {
      return places.find((p) => p.placeType === type);
    },
    [places],
  );

  return {
    places,
    isLoading,
    isRefreshing,
    error,
    isSaving,
    refresh,
    createPlace,
    updatePlace,
    deletePlace,
    togglePlace,
    getPlaceByType,
  };
}
