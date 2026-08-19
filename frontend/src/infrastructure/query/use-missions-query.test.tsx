import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { missionApiClient } from '@infrastructure/api';
import type { Mocked } from 'vitest';
import { useReorderMissionMutation } from './use-missions-query';
import { queryKeys } from './query-keys';

vi.mock('@infrastructure/api');

const mockMissionApi = missionApiClient as Mocked<typeof missionApiClient>;

describe('useReorderMissionMutation', () => {
  it('should invalidate the daily status after reordering', async () => {
    // 오늘의 미션 목록은 sortOrder 순으로 내려온다
    // (mission.repository.impl.ts:28 `order: { missionType, sortOrder }`).
    // 순서를 바꾸고도 daily를 무효화하지 않으면 /missions가 옛 순서를 보여준다.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    function wrapper({ children }: { children: ReactNode }): JSX.Element {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    mockMissionApi.reorder.mockResolvedValue({} as never);

    const { result } = renderHook(() => useReorderMissionMutation(), { wrapper });
    result.current.mutate({ id: 'mission-1', sortOrder: 2 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(queryKeys.missions.all);
    expect(invalidatedKeys).toContainEqual(queryKeys.missions.daily);
  });
});
