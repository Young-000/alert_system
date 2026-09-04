import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlertCrud } from './use-alert-crud';
import type { Alert } from '@infrastructure/api';

const mockGetAlertsByUser = vi.fn();
const mockToggleAlert = vi.fn();
const mockDeleteAlert = vi.fn();

vi.mock('@infrastructure/api', () => ({
  alertApiClient: {
    getAlertsByUser: (...args: unknown[]) => mockGetAlertsByUser(...args),
    toggleAlert: (...args: unknown[]) => mockToggleAlert(...args),
    deleteAlert: (...args: unknown[]) => mockDeleteAlert(...args),
    createAlert: vi.fn(),
    updateAlert: vi.fn(),
  },
}));

// 경로 조회는 테스트마다 성공/실패를 갈아끼울 수 있어야 한다.
// 고정 stub이면 조회 실패 자체를 재현할 수 없다.
const routesStub = vi.hoisted(() => ({
  current: { data: [] as unknown[] | undefined, isError: false, refetch: vi.fn() },
}));

vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => routesStub.current,
}));

const USER_ID = 'user-1';

const alertOn: Alert = {
  id: 'alert-1',
  userId: USER_ID,
  name: '출근 알림',
  schedule: '0 8 * * *',
  alertTypes: ['weather'],
  enabled: true,
} as Alert;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

describe('useAlertCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routesStub.current = { data: [], isError: false, refetch: vi.fn() };
  });

  describe('경로 조회 실패', () => {
    it('경로 조회가 실패하면 routesError로 알린다', async () => {
      // 실패가 `?? []`로 흡수되면 "저장된 경로가 없다"와 구분되지 않는다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      routesStub.current = { data: undefined, isError: true, refetch: vi.fn() };

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.routesError).toBe('저장된 경로를 불러오지 못했습니다');
    });

    it('경로만 실패해도 알림 목록은 계속 쓸 수 있다', async () => {
      // 과잉 차단 회귀 방지 — loadError는 "서버의 기존 알림을 알 수 없다"는 뜻이고
      // 위저드·빠른 프리셋을 닫는 근거다. 부차 조회 실패가 이걸 오염시키면 안 된다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      routesStub.current = { data: undefined, isError: true, refetch: vi.fn() };

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.loadError).toBe('');
    });

    it('둘 다 성공하면 아무 에러도 알리지 않는다', async () => {
      // 대조군 — 정상 경로에 배너가 뜨지 않는다.
      mockGetAlertsByUser.mockResolvedValue([alertOn]);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      expect(result.current.loadError).toBe('');
      expect(result.current.routesError).toBe('');
    });
  });

  describe('handleToggleAlert', () => {
    it('토글이 성공하면 서버 목록을 다시 읽어 캐시를 갱신한다', async () => {
      // 서버는 토글 후 enabled: false를 돌려준다
      mockGetAlertsByUser
        .mockResolvedValueOnce([alertOn])
        .mockResolvedValue([{ ...alertOn, enabled: false }]);
      mockToggleAlert.mockResolvedValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });

      // 캐시를 갱신하지 않으면 staleTime(2분) 안에 재마운트했을 때
      // 화면이 옛 enabled 값으로 되돌아간다
      await waitFor(() => expect(mockGetAlertsByUser).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.alerts[0].enabled).toBe(false));
    });

    it('토글이 실패하면 낙관적 변경을 되돌리고 에러를 알린다', async () => {
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockToggleAlert.mockRejectedValue(new Error('network'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });

      expect(result.current.alerts[0].enabled).toBe(true);
      expect(result.current.error).toBe('알림 상태 변경에 실패했습니다.');
    });
  });
});

describe('useAlertCrud — 실패 사유 전달', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('삭제가 거절되면 서버가 준 사유를 그대로 알린다', async () => {
    // 생성(:232)은 이미 서버 사유를 올린다. 삭제만 '삭제에 실패했습니다.'로
    // 덮으면 이미 지워진 알림(404)에도 사용자가 같은 버튼을 다시 누르게 된다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockDeleteAlert.mockRejectedValue(
      new Error('API Error 404: {"message":"알림을 찾을 수 없습니다."}'),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.handleDeleteClick(alertOn);
    });
    await act(async () => {
      await result.current.handleDeleteConfirm();
    });

    expect(result.current.error).toBe('알림을 찾을 수 없습니다.');
  });

  it('토글이 거절되면 서버가 준 사유를 그대로 알린다', async () => {
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockToggleAlert.mockRejectedValue(
      new Error('API Error 404: {"message":"알림을 찾을 수 없습니다."}'),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    await act(async () => {
      await result.current.handleToggleAlert(alertOn);
    });

    expect(result.current.error).toBe('알림을 찾을 수 없습니다.');
    // 되돌리기는 그대로 유지된다 — 사유를 올리느라 롤백을 잃으면 안 된다.
    expect(result.current.alerts[0].enabled).toBe(true);
  });

  it('연달아 실패해도 두 번째 사유가 첫 번째 타이머에 지워지지 않는다', async () => {
    // 각 실패는 2초 뒤 문구를 지우는 타이머를 건다. 앞선 타이머를 취소하지 않으면
    // 재시도 직후 뜬 문구가 남은 시간만큼만 보이고 사라진다 — 실패가 성공처럼 보인다.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      mockGetAlertsByUser.mockResolvedValue([alertOn]);
      mockToggleAlert.mockRejectedValue(new Error('boom'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

      await waitFor(() => expect(result.current.alerts).toHaveLength(1));

      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });
      expect(result.current.error).not.toBe('');

      // 사용자가 1.5초 뒤 재시도한다 (첫 타이머는 아직 살아 있다)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      await act(async () => {
        await result.current.handleToggleAlert(alertOn);
      });
      expect(result.current.error).not.toBe('');

      // 첫 타이머가 터지는 시점(t=2000). 두 번째 문구는 t=3500까지 살아야 한다.
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.error).toBe('알림 상태 변경에 실패했습니다.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('사유를 못 꺼내면 기존 문구로 되돌아간다', async () => {
    // 대조군 — 본문 없는 실패까지 빈 문구로 만들지 않는다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockDeleteAlert.mockRejectedValue(new Error('boom'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    act(() => {
      result.current.handleDeleteClick(alertOn);
    });
    await act(async () => {
      await result.current.handleDeleteConfirm();
    });

    expect(result.current.error).toBe('삭제에 실패했습니다.');
  });
});
