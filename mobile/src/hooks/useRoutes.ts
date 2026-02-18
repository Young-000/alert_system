import { useCallback, useEffect, useRef, useState } from 'react';

import { routeService } from '@/services/route.service';
import { useAuth } from './useAuth';

import type { RouteResponse } from '@/types/home';
import type { CreateRouteDto, UpdateRouteDto } from '@/types/route';

type UseRoutesReturn = {
  routes: RouteResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isSaving: boolean;
  refresh: () => Promise<void>;
  createRoute: (dto: Omit<CreateRouteDto, 'userId'>) => Promise<boolean>;
  updateRoute: (id: string, dto: UpdateRouteDto) => Promise<boolean>;
  deleteRoute: (id: string) => Promise<boolean>;
  togglePreferred: (id: string) => void;
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

  // Create
  const createRoute = useCallback(
    async (dto: Omit<CreateRouteDto, 'userId'>): Promise<boolean> => {
      if (!user) return false;
      setIsSaving(true);
      try {
        await routeService.createRoute({ ...dto, userId: user.id });
        await fetchRoutes();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchRoutes],
  );

  // Update
  const updateRoute = useCallback(
    async (id: string, dto: UpdateRouteDto): Promise<boolean> => {
      setIsSaving(true);
      try {
        await routeService.updateRoute(id, dto);
        await fetchRoutes();
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchRoutes],
  );

  // Delete (optimistic)
  const deleteRoute = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = routes;
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      try {
        await routeService.deleteRoute(id);
        return true;
      } catch {
        // Rollback
        setRoutes(previous);
        return false;
      }
    },
    [routes],
  );

  // Toggle preferred (optimistic + rollback)
  const togglePreferred = useCallback(
    (id: string): void => {
      if (togglingIds.current.has(id)) return;
      togglingIds.current.add(id);

      // Optimistic UI update
      setRoutes((prev) =>
        sortRoutes(
          prev.map((r) =>
            r.id === id ? { ...r, isPreferred: !r.isPreferred } : r,
          ),
        ),
      );

      routeService
        .updateRoute(id, {
          isPreferred: !routes.find((r) => r.id === id)?.isPreferred,
        })
        .catch(() => {
          // Rollback on failure
          setRoutes((prev) =>
            sortRoutes(
              prev.map((r) =>
                r.id === id ? { ...r, isPreferred: !r.isPreferred } : r,
              ),
            ),
          );
        })
        .finally(() => {
          togglingIds.current.delete(id);
        });
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
