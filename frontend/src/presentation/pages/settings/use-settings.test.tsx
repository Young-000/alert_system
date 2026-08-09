import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@infrastructure/query/query-keys';
import { useSettings } from './use-settings';

const mockDeleteAllData = vi.fn();

vi.mock('@infrastructure/api', () => ({
  userApiClient: {
    deleteAllData: (...args: unknown[]) => mockDeleteAllData(...args),
    exportData: vi.fn(),
  },
}));

vi.mock('@infrastructure/query/use-alerts-query', () => ({
  useAlertsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock('@infrastructure/push/push-manager', () => ({
  isPushSupported: vi.fn().mockResolvedValue(false),
  isPushSubscribed: vi.fn().mockResolvedValue(false),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const USER_ID = 'user-1';

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'user-1', phoneNumber: '', isLoggedIn: true }),
  notifyAuthChange: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDeleteAllData', () => {
    it('추적 데이터 삭제가 성공하면 캐시된 통계도 무효화한다', async () => {
      mockDeleteAllData.mockResolvedValue({ deleted: { behaviorEvents: 3, commuteRecords: 2 } });

      const { wrapper, queryClient } = createWrapper();
      // 다른 화면이 이미 읽어둔 통계 캐시
      queryClient.setQueryData(queryKeys.commuteStats.byUser(USER_ID, 30), { total: 12 });

      const { result } = renderHook(() => useSettings(), { wrapper });

      await act(async () => {
        await result.current.handleDeleteAllData();
      });

      expect(mockDeleteAllData).toHaveBeenCalledWith(USER_ID);
      // 무효화하지 않으면 "삭제되었습니다" 직후 대시보드에 지운 기록이 그대로 남는다
      await waitFor(() => {
        expect(
          queryClient.getQueryState(queryKeys.commuteStats.byUser(USER_ID, 30))?.isInvalidated
        ).toBe(true);
      });
    });

    it('삭제가 실패하면 캐시를 건드리지 않고 실패를 알린다', async () => {
      mockDeleteAllData.mockRejectedValue(new Error('server'));

      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(queryKeys.commuteStats.byUser(USER_ID, 30), { total: 12 });

      const { result } = renderHook(() => useSettings(), { wrapper });

      await act(async () => {
        await result.current.handleDeleteAllData();
      });

      expect(result.current.privacyMessage).toBe('데이터 삭제에 실패했습니다.');
      expect(
        queryClient.getQueryState(queryKeys.commuteStats.byUser(USER_ID, 30))?.isInvalidated
      ).toBe(false);
    });
  });
});
