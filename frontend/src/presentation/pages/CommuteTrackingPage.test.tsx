import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CommuteTrackingPage />
    </MemoryRouter>
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
