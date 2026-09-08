import { useCallback, useEffect, useRef, useState } from 'react';

import { routeService } from '@/services/route.service';
import { serverMessage } from '@/utils/api-error';
import { useAuth } from './useAuth';

import type { RouteResponse } from '@/types/home';
import type { CreateRouteDto, UpdateRouteDto } from '@/types/route';

/**
 * 저장 결과. 형제 훅(`usePlaces`·`useSmartDeparture`)과 같은 계약이다.
 *
 * boolean으로 접으면 화면은 사유를 추측할 수밖에 없어 "저장에 실패했습니다"만
 * 띄운다. 그런데 서버가 거절하는 사유는 문장으로 내려온다 — 검증 실패
 * (`경로 이름은 필수입니다.`·`최소 하나의 체크포인트가 필요합니다.`,
 * `backend/src/application/dto/commute.dto.ts`)와 404(`경로를 찾을 수 없습니다.`,
 * `manage-route.use-case.ts`)가 대표적이다. 유니온이면 실패 가지의 `message`가
 * 타입상 보장되므로 빈 문구가 뜰 수 없다.
 */
export type SaveRouteResult =
  | { saved: true }
  | { saved: false; message: string };

/** 삭제 결과. 저장(`SaveRouteResult`)과 같은 계약을 따른다. */
export type DeleteRouteResult =
  | { deleted: true }
  | { deleted: false; message: string };

/** 서버가 사유를 안 줬을 때(네트워크 단절 등)의 문구. */
const SAVE_FAILED_FALLBACK = '저장하지 못했습니다. 잠시 후 다시 시도해주세요.';

/** 서버가 사유를 안 줬을 때의 삭제 문구. */
const DELETE_FAILED_FALLBACK = '삭제하지 못했습니다. 잠시 후 다시 시도해주세요.';

type UseRoutesReturn = {
  routes: RouteResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createRoute: (dto: Omit<CreateRouteDto, 'userId'>) => Promise<SaveRouteResult>;
  updateRoute: (id: string, dto: UpdateRouteDto) => Promise<SaveRouteResult>;
  deleteRoute: (id: string) => Promise<DeleteRouteResult>;
  togglePreferred: (id: string) => Promise<boolean>;
};

function sortRoutes(routes: RouteResponse[]): RouteResponse[] {
  return [...routes].sort((a, b) => {
    // Preferred first
    if (a.isPreferred !== b.isPreferred) {
      return a.isPreferred ? -1 : 1;
    }
    // Then alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

export function useRoutes(): UseRoutesReturn {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const togglingIds = useRef(new Set<string>());

  const fetchRoutes = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const data = await routeService.fetchRoutes(user.id);
      setRoutes(sortRoutes(data));
      setError(null);
    } catch {
      setError('경로를 불러올 수 없어요');
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchRoutes().finally(() => setIsLoading(false));
  }, [user, fetchRoutes]);

  // Pull-to-refresh
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchRoutes();
    setIsRefreshing(false);
  }, [fetchRoutes]);

  // 저장 → 재조회는 생성·수정이 똑같이 밟는 순서라 한곳에 모은다.
  // `isSaving`은 재조회까지 끝나야 내린다 — 폼이 닫히기 전에 버튼이 잠깐
  // 다시 눌리는 상태를 만들지 않기 위해서다.
  const saveThenReload = useCallback(
    async (save: () => Promise<unknown>): Promise<SaveRouteResult> => {
      setIsSaving(true);
      try {
        try {
          await save();
        } catch (err) {
          // 서버가 말해준 사유를 그대로 넘긴다. 화면이 추측하지 않도록.
          return { saved: false, message: serverMessage(err) ?? SAVE_FAILED_FALLBACK };
        }
        // 저장은 끝났다. `fetchRoutes`는 실패를 스스로 삼켜 `error`에 남기므로
        // 재조회 실패가 저장 성공 판정을 뒤집지 않는다.
        await fetchRoutes();
        return { saved: true };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchRoutes],
  );

  // Create
  const createRoute = useCallback(
    async (dto: Omit<CreateRouteDto, 'userId'>): Promise<SaveRouteResult> => {
      if (!user) return { saved: false, message: '로그인이 필요합니다.' };
      return saveThenReload(() => routeService.createRoute({ ...dto, userId: user.id }));
    },
    [user, saveThenReload],
  );

  // Update
  const updateRoute = useCallback(
    async (id: string, dto: UpdateRouteDto): Promise<SaveRouteResult> =>
      saveThenReload(() => routeService.updateRoute(id, dto)),
    [saveThenReload],
  );

  // Delete (optimistic)
  const deleteRoute = useCallback(
    async (id: string): Promise<DeleteRouteResult> => {
      const previous = routes;
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      try {
        await routeService.deleteRoute(id);
        return { deleted: true };
      } catch (err) {
        // Rollback
        setRoutes(previous);
        // 생성·수정과 같은 계약: 서버가 말해준 사유를 그대로 넘긴다.
        // 대표 사유는 목록이 낡아 이미 지워진 경로를 지우려 한 404다 —
        // 다시 시도해도 결과는 같고 필요한 행동은 목록 새로고침이다.
        return { deleted: false, message: serverMessage(err) ?? DELETE_FAILED_FALLBACK };
      }
    },
    [routes],
  );

  // Toggle preferred (optimistic + rollback)
  //
  // 생성·수정·삭제와 같은 계약: 실패하면 boolean으로 알린다.
  const togglePreferred = useCallback(
    async (id: string): Promise<boolean> => {
      // 이미 진행 중인 요청이 있으면 중복 탭이다 — 실패가 아니므로 true.
      if (togglingIds.current.has(id)) return true;
      togglingIds.current.add(id);

      // Optimistic UI update
      setRoutes((prev) =>
        sortRoutes(
          prev.map((r) =>
            r.id === id ? { ...r, isPreferred: !r.isPreferred } : r,
          ),
        ),
      );

      try {
        await routeService.updateRoute(id, {
          isPreferred: !routes.find((r) => r.id === id)?.isPreferred,
        });
        return true;
      } catch {
        // Rollback on failure
        setRoutes((prev) =>
          sortRoutes(
            prev.map((r) =>
              r.id === id ? { ...r, isPreferred: !r.isPreferred } : r,
            ),
          ),
        );
        return false;
      } finally {
        togglingIds.current.delete(id);
      }
    },
    [routes],
  );

  return {
    routes,
    isLoading,
    isRefreshing,
    error,
    isSaving,
    refresh,
    createRoute,
    updateRoute,
    deleteRoute,
    togglePreferred,
  };
}
