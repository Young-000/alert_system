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

type RoutesQueryStub = { data: unknown[]; isError: boolean; error: Error | null; refetch: () => void };

// 테스트마다 경로 조회의 성공/실패를 바꿔야 해서 가변 객체로 둔다.
const mockRoutesQuery: RoutesQueryStub = {
  data: [],
  isError: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock('@infrastructure/query/use-routes-query', () => ({
  useRoutesQuery: () => mockRoutesQuery,
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

beforeEach(() => {
  mockRoutesQuery.data = [];
  mockRoutesQuery.isError = false;
  mockRoutesQuery.error = null;
});

describe('useAlertCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

describe('경로 목록 조회 실패', () => {
  // 알림 목록과 경로 목록은 같은 화면을 채우는 형제 쿼리다.
  // 경로 조회만 실패하면 savedRoutes가 빈 배열이 되어, 저장된 경로가 있는
  // 사용자에게도 "저장된 경로에서 가져오기" 단축 경로가 사라지고
  // 기존 알림의 연결 경로 이름도 지워진다 — 그런데 화면에는 아무 표시가 없다.
  it('경로 조회가 실패하면 routesError로 알린다', async () => {
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockRoutesQuery.isError = true;
    mockRoutesQuery.error = new Error('network');

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    expect(result.current.routesError).not.toBe('');
  });

  it('경로만 실패해도 알림 목록은 계속 쓸 수 있다', async () => {
    // loadError는 "기존 알림을 알 수 없다"는 뜻이라 위저드·빠른 프리셋을 막는다.
    // 경로 조회 실패로 그걸 막으면 부차 쿼리가 주 기능을 가린다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);
    mockRoutesQuery.isError = true;
    mockRoutesQuery.error = new Error('network');

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    expect(result.current.loadError).toBe('');
  });

  it('둘 다 성공하면 아무 에러도 알리지 않는다', async () => {
    // 대조군 — 정상 경로에서 에러 배너가 뜨면 안 된다.
    mockGetAlertsByUser.mockResolvedValue([alertOn]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertCrud(USER_ID), { wrapper });

    await waitFor(() => expect(result.current.alerts).toHaveLength(1));

    expect(result.current.loadError).toBe('');
    expect(result.current.routesError).toBe('');
  });
});
