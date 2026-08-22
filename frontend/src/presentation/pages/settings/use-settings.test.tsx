import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@infrastructure/query/query-keys';
import { subscribeToPush, unsubscribeFromPush } from '@infrastructure/push/push-manager';
import { useSettings } from './use-settings';

const mockDeleteAllData = vi.fn();

vi.mock('@infrastructure/api', () => ({
  userApiClient: {
    deleteAllData: (...args: unknown[]) => mockDeleteAllData(...args),
    exportData: vi.fn(),
  },
}));

const alertsQueryState = { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() };
const routesQueryState = { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() };

vi.mock('@infrastructure/query/use-alerts-query', () => ({
  useAlertsQuery: () => alertsQueryState,
}));

vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => routesQueryState,
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
    alertsQueryState.isError = false;
    routesQueryState.isError = false;
  });

  describe('목록 조회 실패', () => {
    // 실패해도 `data ?? []`가 빈 배열을 내놓기 때문에, 에러를 따로 알리지 않으면
    // 저장된 경로·알림이 멀쩡히 있는 사용자에게 화면이 "없어요"라고 단언한다.
    it('경로 조회가 실패하면 loadError로 알린다', () => {
      routesQueryState.isError = true;
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.loadError).toBe('경로와 알림을 불러오지 못했어요');
    });

    it('알림 조회가 실패하면 loadError로 알린다', () => {
      alertsQueryState.isError = true;
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.loadError).toBe('경로와 알림을 불러오지 못했어요');
    });

    it('둘 다 성공하면 loadError가 비어 있다', () => {
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.loadError).toBe('');
    });

    it('retryLoad는 두 조회를 모두 다시 부른다', () => {
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useSettings(), { wrapper });
      act(() => {
        result.current.retryLoad();
      });

      expect(alertsQueryState.refetch).toHaveBeenCalledTimes(1);
      expect(routesQueryState.refetch).toHaveBeenCalledTimes(1);
    });
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
  describe('handleTogglePush', () => {
    it('권한을 못 받아 구독이 false를 돌려주면 해제 방법을 알려준다', async () => {
      // 브라우저는 한 번 차단한 사이트에 권한 창을 다시 띄우지 않는다.
      // 안내가 없으면 사용자는 눌러도 안 켜지는 이유를 끝내 알 수 없다.
      vi.mocked(subscribeToPush).mockResolvedValue(false);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSettings(), { wrapper });

      await act(async () => {
        await result.current.handleTogglePush();
      });

      expect(result.current.pushEnabled).toBe(false);
      expect(result.current.actionError).toBe(
        '알림 권한이 없어 켜지 못했습니다. 브라우저 설정에서 알림을 허용해주세요.'
      );
    });

    it('구독에 성공하면 경고 없이 켜진다', async () => {
      vi.mocked(subscribeToPush).mockResolvedValue(true);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSettings(), { wrapper });

      await act(async () => {
        await result.current.handleTogglePush();
      });

      expect(result.current.pushEnabled).toBe(true);
      expect(result.current.actionError).toBe('');
    });

    it('구독이 던지면 기존 실패 메시지를 유지한다', async () => {
      vi.mocked(subscribeToPush).mockRejectedValue(new Error('network'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSettings(), { wrapper });

      await act(async () => {
        await result.current.handleTogglePush();
      });

      expect(result.current.actionError).toBe('푸시 알림 설정에 실패했습니다.');
    });

    it('구독 해제는 안내 없이 꺼진다', async () => {
      vi.mocked(unsubscribeFromPush).mockResolvedValue(true);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSettings(), { wrapper });

      // 켠 뒤 다시 끈다
      vi.mocked(subscribeToPush).mockResolvedValue(true);
      await act(async () => {
        await result.current.handleTogglePush();
      });
      await act(async () => {
        await result.current.handleTogglePush();
      });

      expect(result.current.pushEnabled).toBe(false);
      expect(result.current.actionError).toBe('');
    });
  });
});
