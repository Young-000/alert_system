import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@infrastructure/query/query-keys';
import { CommuteTrackingPage } from './CommuteTrackingPage';
import {
  commuteApiClient,
  getCommuteApiClient,
} from '@infrastructure/api';
import type { Mocked, MockedFunction } from 'vitest';

// Mock navigate and location
const mockNavigate = vi.fn();
let mockLocationState: Record<string, unknown> | null = null;
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState, pathname: '/commute' }),
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock('@infrastructure/api');

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => {
    const userId = localStorage.getItem('userId') || '';
    return {
      userId,
      userName: '회원',
      userEmail: '',
      phoneNumber: '',
      isLoggedIn: !!userId,
    };
  },
  notifyAuthChange: vi.fn(),
}));

const mockCommuteApi = commuteApiClient as Mocked<typeof commuteApiClient>;
const mockGetCommuteApi = getCommuteApiClient as MockedFunction<typeof getCommuteApiClient>;

let testQueryClient: QueryClient;

function renderPage(): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter>
        <CommuteTrackingPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Fixtures
const mockRoute = {
  id: 'route-1',
  userId: 'test-user-id',
  name: '강남 출근길',
  routeType: 'morning' as const,
  isPreferred: true,
  totalExpectedDuration: 45,
  totalTransferTime: 5,
  pureMovementTime: 40,
  checkpoints: [
    {
      id: 'cp-1',
      sequenceOrder: 1,
      name: '집',
      checkpointType: 'home' as const,
      expectedWaitTime: 0,
      totalExpectedTime: 0,
      isTransferRelated: false,
    },
    {
      id: 'cp-2',
      sequenceOrder: 2,
      name: '강남역',
      checkpointType: 'subway' as const,
      linkedStationId: 'station-1',
      lineInfo: '2호선',
      expectedWaitTime: 3,
      totalExpectedTime: 20,
      isTransferRelated: false,
    },
    {
      id: 'cp-3',
      sequenceOrder: 3,
      name: '회사',
      checkpointType: 'work' as const,
      expectedWaitTime: 0,
      totalExpectedTime: 10,
      isTransferRelated: false,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockInProgressSession = {
  id: 'session-1',
  userId: 'test-user-id',
  routeId: 'route-1',
  startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  status: 'in_progress' as const,
  totalWaitMinutes: 0,
  totalDelayMinutes: 0,
  progress: 33,
  delayStatus: 'on_time',
  pureMovementTime: 0,
  waitTimePercentage: 0,
  checkpointRecords: [],
};

const mockCompletedSession = {
  ...mockInProgressSession,
  id: 'session-1',
  status: 'completed' as const,
  completedAt: new Date().toISOString(),
  totalDurationMinutes: 42,
  checkpointRecords: [
    {
      id: 'rec-1',
      checkpointId: 'cp-1',
      arrivedAt: new Date().toISOString(),
      arrivalTimeString: '08:00',
      actualWaitTime: 0,
      isDelayed: false,
      delayMinutes: 0,
      waitDelayMinutes: 0,
      delayStatus: 'on_time',
      waitDelayStatus: 'on_time',
      totalDuration: 0,
    },
  ],
};

describe('CommuteTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    mockLocationState = null;
    mockSearchParams = new URLSearchParams();
    mockGetCommuteApi.mockReturnValue(mockCommuteApi);
    mockCommuteApi.getInProgressSession.mockResolvedValue(null);
    mockCommuteApi.getUserRoutes.mockResolvedValue([mockRoute]);
    mockCommuteApi.startSession.mockResolvedValue(mockInProgressSession);
    mockCommuteApi.completeSession.mockResolvedValue(mockCompletedSession);
    mockCommuteApi.cancelSession.mockResolvedValue({ success: true });
    mockCommuteApi.recordCheckpoint.mockResolvedValue(mockInProgressSession);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // --- Auth ---

  it('should redirect to login if not authenticated', () => {
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // --- Loading ---

  it('should show loading state initially', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.getInProgressSession.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('준비 중...')).toBeInTheDocument();
  });

  // --- Redirect when no route ---

  it('should redirect to home when no routeId and no active session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getInProgressSession.mockResolvedValue(null);

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('should redirect to home when navigation routeId no longer exists', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'deleted-route-id' };
    mockCommuteApi.getUserRoutes.mockResolvedValue([mockRoute]);

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(mockCommuteApi.startSession).not.toHaveBeenCalled();
  });

  // --- Active session display ---

  it('should display active session with timer and route name', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('출근 중')).toBeInTheDocument();
    });

    expect(screen.getByText('강남 출근길')).toBeInTheDocument();
    expect(screen.getByText('경과 시간')).toBeInTheDocument();
    expect(screen.getByText('도착')).toBeInTheDocument();
    expect(screen.getByText('기록 취소')).toBeInTheDocument();
  });

  it('should display checkpoint timeline for active session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getInProgressSession.mockResolvedValue(mockInProgressSession);

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('집')).toBeInTheDocument();
    });

    expect(screen.getByText('강남역')).toBeInTheDocument();
    expect(screen.getByText('회사')).toBeInTheDocument();
    expect(screen.getByText('현재')).toBeInTheDocument();
  });

  // --- Existing session recovery ---

  it('should recover existing in-progress session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getInProgressSession.mockResolvedValue(mockInProgressSession);

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('출근 중')).toBeInTheDocument();
    });

    // Should not start a new session
    expect(mockCommuteApi.startSession).not.toHaveBeenCalled();
  });

  // --- Complete action ---

  it('should show completed state after clicking arrive button', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('출근 완료!')).toBeInTheDocument();
    });

    expect(screen.getByText('42')).toBeInTheDocument(); // duration
    expect(screen.getByText('분')).toBeInTheDocument();
    expect(screen.getByText('홈으로')).toBeInTheDocument();
  });

  // --- 완료 직전 자동 기록(best-effort)과 재시도 ---
  //
  // `도착`을 누르면 아직 기록되지 않은 체크포인트를 먼저 자동 기록하고 세션을 완료한다.
  // 이 자동 기록은 `actualWaitTime: 0` 자리값을 채우는 보조 단계일 뿐이고,
  // 서버의 completeSession은 체크포인트가 다 기록돼 있기를 요구하지 않는다.
  // 그런데 이걸 Promise.all로 묶으면 한 건만 실패해도 완료 자체가 막힌다.
  it('should still complete the session when one auto-record fails', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.recordCheckpoint.mockImplementation(({ checkpointId }) =>
      checkpointId === 'cp-2'
        ? Promise.reject(new Error('API Error 500: {"message":"boom"}'))
        : Promise.resolve(mockInProgressSession),
    );

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('출근 완료!')).toBeInTheDocument();
    });
    expect(mockCommuteApi.completeSession).toHaveBeenCalledWith({ sessionId: 'session-1' });
  });

  // 재시도 경로. 앞선 시도에서 일부가 이미 서버에 기록됐다면 서버는 그 체크포인트에
  // 400 'Checkpoint already recorded'를 준다. 화면의 session 상태는 갱신되지 않으므로
  // 다시 눌러도 같은 체크포인트를 또 보낸다 — 이걸 실패로 취급하면 이 화면에서는
  // 세션을 영영 완료할 수 없고, 안내는 계속 "네트워크 연결을 확인해주세요"라고 말한다.
  it('should complete the session when every checkpoint is already recorded', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.recordCheckpoint.mockRejectedValue(
      new Error('API Error 400: {"message":"Checkpoint already recorded for this session"}'),
    );

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('출근 완료!')).toBeInTheDocument();
    });
  });

  // 대조군: 완료 요청 자체가 실패하면 지금처럼 실패라고 말해야 한다.
  // 위 두 건이 '무조건 완료된 척'으로 번지지 않았는지 고정한다.
  it('should show an error when the completion request itself fails', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.completeSession.mockRejectedValue(
      new Error('API Error 500: {"message":"boom"}'),
    );

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('기록 완료에 실패했습니다. 네트워크 연결을 확인해주세요.'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('출근 완료!')).not.toBeInTheDocument();
  });

  // --- 세션 완료 후 캐시 무효화 ---
  //
  // 완료 응답은 서버에서 스트릭·기록·주간 리포트를 함께 바꾼다
  // (commute.controller: completeSession -> recordCompletion). 그런데 이 화면이
  // 캐시를 건드리지 않으면 홈은 출근 전 숫자를 그대로 그린다 — 조회 훅들이
  // staleTime 5~15분에 refetchOnWindowFocus: false 라서 `홈으로`를 눌러도
  // 다시 받아오지 않는다. 훅 주석이 "세션 완료 시 invalidate"라고 약속한 그 무효화다.
  it('should invalidate stats/streak/report caches after completing a session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    const invalidateSpy = vi.spyOn(testQueryClient, 'invalidateQueries');

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('출근 완료!')).toBeInTheDocument();
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey),
    );

    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.commuteStats.all));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.streak.all));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.weeklyReport.all));
    expect(invalidatedKeys).toContain(JSON.stringify(queryKeys.analyticsSummary.all));
  });

  // 대조군: 완료하지 않고 취소하면 서버 통계는 그대로다. 취소까지 무효화하면
  // 홈이 바뀐 것도 없는데 매번 네 갈래를 다시 받아온다.
  it('should not invalidate stats caches when cancelling a session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    const invalidateSpy = vi.spyOn(testQueryClient, 'invalidateQueries');

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('기록 취소'));

    await waitFor(() => {
      expect(screen.getByText('취소하기')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('취소하기'));
    });

    await waitFor(() => {
      expect(mockCommuteApi.cancelSession).toHaveBeenCalledWith('session-1');
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      ([arg]) => JSON.stringify((arg as { queryKey: unknown }).queryKey),
    );
    expect(invalidatedKeys).not.toContain(JSON.stringify(queryKeys.commuteStats.all));
  });

  it('should show comparison text when duration differs from expected', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    // Route has totalExpectedDuration: 45, session has 42 minutes
    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('평소보다 3분 빨랐어요')).toBeInTheDocument();
    });
  });

  it('should navigate home when clicking home button on completed state', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('홈으로')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('홈으로'));

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  // --- Cancel action ---

  it('should show cancel confirmation modal', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('기록 취소')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('기록 취소'));

    await waitFor(() => {
      expect(screen.getByText('정말 취소하시겠습니까?')).toBeInTheDocument();
    });
    expect(screen.getByText('현재까지의 기록이 모두 삭제됩니다.')).toBeInTheDocument();
    expect(screen.getByText('취소하기')).toBeInTheDocument();
    expect(screen.getByText('계속 기록')).toBeInTheDocument();
  });

  it('should cancel session and navigate home when confirmed', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('기록 취소')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('기록 취소'));

    await waitFor(() => {
      expect(screen.getByText('취소하기')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('취소하기'));
    });

    await waitFor(() => {
      expect(mockCommuteApi.cancelSession).toHaveBeenCalledWith('session-1');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should dismiss cancel modal when clicking continue recording', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('기록 취소')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('기록 취소'));

    await waitFor(() => {
      expect(screen.getByText('계속 기록')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('계속 기록'));

    await waitFor(() => {
      expect(screen.queryByText('정말 취소하시겠습니까?')).not.toBeInTheDocument();
    });
  });

  // --- Error handling ---

  it('should show error message when data loading fails', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.getInProgressSession.mockRejectedValue(new Error('Network error'));
    mockCommuteApi.getUserRoutes.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('데이터를 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should retry data loading in place when clicking retry after a load failure', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.getInProgressSession.mockRejectedValue(new Error('Network error'));
    mockCommuteApi.getUserRoutes.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });

    // 재시도는 성공하도록 전환
    mockCommuteApi.getInProgressSession.mockResolvedValue(null);
    mockCommuteApi.getUserRoutes.mockResolvedValue([mockRoute]);
    const callsBefore = mockCommuteApi.getInProgressSession.mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByText('다시 시도'));
    });

    // 전체 페이지 리로드가 아니라 데이터 로드만 재실행되어야 한다
    await waitFor(() => {
      expect(mockCommuteApi.getInProgressSession.mock.calls.length).toBeGreaterThan(
        callsBefore
      );
    });
    await waitFor(() => {
      expect(screen.getByText('출근 중')).toBeInTheDocument();
    });
  });

  // --- Back button behavior ---

  it('should show cancel confirm when clicking back during active session', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('세션 취소')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('세션 취소'));

    await waitFor(() => {
      expect(screen.getByText('정말 취소하시겠습니까?')).toBeInTheDocument();
    });
  });

  // --- Disable button while completing ---

  it('should disable arrive button while completing', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockLocationState = { routeId: 'route-1' };
    mockCommuteApi.completeSession.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(screen.getByText('도착')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('도착'));
    });

    await waitFor(() => {
      expect(screen.getByText('저장 중...')).toBeInTheDocument();
    });
  });
});
