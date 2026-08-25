import { useCallback, useEffect, useRef, useState } from 'react';

import { placeService } from '@/services/place.service';
import { useAuth } from './useAuth';

import type { CreatePlaceDto, Place, UpdatePlaceDto } from '@/types/place';

/**
 * 저장 결과. 저장 자체의 성공과 목록 재조회의 성공을 분리한다.
 *
 * 둘을 하나로 합치면, 저장은 됐는데 재조회만 실패한 경우(저장 직후 네트워크가
 * 끊긴 경우)에 폼이 "저장에 실패했습니다"를 띄운다. 사용자가 다시 저장하면
 * 같은 장소가 두 번 만들어진다.
 */
type SaveResult = {
  /** 서버 저장이 성공했는가. 폼의 성공·실패 판정은 이 값만 본다. */
  saved: boolean;
  /** 재조회에 성공했을 때의 최신 목록(서버가 매긴 실제 id 포함). 실패하면 null. */
  places: Place[] | null;
};

type UsePlacesReturn = {
  places: Place[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createPlace: (dto: CreatePlaceDto) => Promise<SaveResult>;
  updatePlace: (id: string, dto: UpdatePlaceDto) => Promise<SaveResult>;
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

  // 새로 받아온 목록을 그대로 돌려준다. 저장 직후 지오펜스를 다시 등록하려면
  // 서버가 매긴 실제 id가 필요한데, 렌더 클로저의 `places`는 저장 전 스냅샷이라
  // 쓸 수 없다(수정 시 옛 좌표로 등록됨).
  const fetchPlaces = useCallback(async (): Promise<Place[] | null> => {
    if (!user) return null;

    try {
      const data = await placeService.fetchPlaces();
      setPlaces(data);
      setError(null);
      return data;
    } catch {
      setError('장소를 불러올 수 없어요');
      return null;
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

  // 저장 → 재조회는 생성·수정이 똑같이 밟는 순서라 한곳에 모은다.
  // `isSaving`은 재조회까지 끝나야 내린다 — 폼이 닫히기 전에 버튼이
  // 잠깐 다시 눌리는 상태를 만들지 않기 위해서다.
  const saveThenReload = useCallback(
    async (save: () => Promise<unknown>): Promise<SaveResult> => {
      setIsSaving(true);
      try {
        try {
          await save();
        } catch {
          return { saved: false, places: null };
        }
        // 저장은 끝났다. 재조회가 실패해도 저장 자체는 성공이다.
        return { saved: true, places: await fetchPlaces() };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchPlaces],
  );

  // Create
  const createPlace = useCallback(
    async (dto: CreatePlaceDto): Promise<SaveResult> => {
      if (!user) return { saved: false, places: null };
      return saveThenReload(() => placeService.createPlace(dto));
    },
    [user, saveThenReload],
  );

  // Update
  const updatePlace = useCallback(
    async (id: string, dto: UpdatePlaceDto): Promise<SaveResult> =>
      saveThenReload(() => placeService.updatePlace(id, dto)),
    [saveThenReload],
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
