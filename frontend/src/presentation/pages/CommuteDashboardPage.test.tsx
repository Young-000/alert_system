import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteDashboardPage } from './CommuteDashboardPage';
import {
  commuteApiClient,
  getCommuteApiClient,
  getBehaviorApiClient,
  behaviorApiClient,
} from '@infrastructure/api';
import type { Mocked, MockedFunction } from 'vitest';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
const mockBehaviorApi = behaviorApiClient as Mocked<typeof behaviorApiClient>;
const mockGetBehaviorApi = getBehaviorApiClient as MockedFunction<typeof getBehaviorApiClient>;

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CommuteDashboardPage />
    </MemoryRouter>
  );
}

// Fixtures
const mockStatsWithData = {
  userId: 'test-user-id',
  totalSessions: 10,
  recentSessions: 3,
  overallAverageDuration: 42,
  overallAverageWaitTime: 5,
  overallAverageDelay: 2,
  waitTimePercentage: 12,
  routeStats: [
    {
      routeId: 'route-1',
      routeName: '강남 출근길',
      totalSessions: 7,
      averageTotalDuration: 40,
      averageTotalWaitTime: 5,
      averageDelay: 1,
      waitTimePercentage: 12,
      checkpointStats: [],
    },
  ],
  dayOfWeekStats: [
    { dayOfWeek: 1, dayName: '월요일', averageDuration: 45, averageWaitTime: 3, averageDelay: 1, sampleCount: 2 },
    { dayOfWeek: 2, dayName: '화요일', averageDuration: 38, averageWaitTime: 2, averageDelay: 0, sampleCount: 2 },
    { dayOfWeek: 3, dayName: '수요일', averageDuration: 42, averageWaitTime: 3, averageDelay: 1, sampleCount: 1 },
  ],
  weatherImpact: [],
  insights: ['화요일이 평균적으로 가장 빠릅니다'],
};

const mockEmptyStats = {
  userId: 'test-user-id',
  totalSessions: 0,
  recentSessions: 0,
  overallAverageDuration: 0,
  overallAverageWaitTime: 0,
  overallAverageDelay: 0,
  waitTimePercentage: 0,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [],
  insights: [],
};

const mockHistory = {
  userId: 'test-user-id',
  sessions: [
    {
      id: 'session-1',
      routeId: 'route-1',
      routeName: '출근길',
      startedAt: '2026-02-18T08:00:00Z',
      completedAt: '2026-02-18T08:42:00Z',
      totalDurationMinutes: 42,
      totalWaitMinutes: 5,
      totalDelayMinutes: 2,
      status: 'completed' as const,
      delayStatus: 'on_time',
    },
  ],
  totalCount: 1,
  hasMore: false,
};

const mockBehaviorAnalytics = {
  totalPatterns: 0,
  totalCommuteRecords: 2,
  averageConfidence: 0,
  hasEnoughData: false,
};

describe('CommuteDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCommuteApi.mockReturnValue(mockCommuteApi);
    mockGetBehaviorApi.mockReturnValue(mockBehaviorApi);
    mockCommuteApi.getStats.mockResolvedValue(mockEmptyStats);
    mockCommuteApi.getHistory.mockResolvedValue(mockHistory);
    mockCommuteApi.getUserAnalytics.mockResolvedValue([]);
    mockBehaviorApi.getAnalytics.mockResolvedValue(mockBehaviorAnalytics);
    mockBehaviorApi.getPatterns.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- Auth ---

  it('should show login message if not authenticated', () => {
    renderPage();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByText('통근 통계를 보려면 먼저 로그인하세요')).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  // --- Loading ---

  it('should show loading state while data is being fetched', () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockReturnValue(new Promise(() => {}));
    mockCommuteApi.getHistory.mockReturnValue(new Promise(() => {}));
    mockCommuteApi.getUserAnalytics.mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText('통계를 불러오는 중...')).toBeInTheDocument();
  });

  // --- Empty state ---

  it('should show empty state when no sessions', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockEmptyStats);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('아직 기록이 없어요')).toBeInTheDocument();
    });
    expect(screen.getByText('출퇴근 트래킹을 시작해보세요. 이동 시간을 기록하면 통계를 볼 수 있어요.')).toBeInTheDocument();
    expect(screen.getByText('트래킹 시작하기')).toBeInTheDocument();
  });

  // --- Dashboard with data ---

  it('should render dashboard page with tabs when data exists', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('통근 통계')).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: '전체 요약' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '경로 비교' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '기록' })).toBeInTheDocument();
  });

  it('should show overview stats on the overview tab', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      // "42분" may appear in both stat card and history — use getAllByText
      expect(screen.getAllByText('42분').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('3회').length).toBeGreaterThanOrEqual(1);
  });

  it('should show insights on overview tab', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('화요일이 평균적으로 가장 빠릅니다')).toBeInTheDocument();
    });
  });

  // --- Tab navigation ---

  it('should switch to history tab', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '기록' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: '기록' }));

    await waitFor(() => {
      expect(screen.getByText('최근 기록')).toBeInTheDocument();
    });
  });

  it('should switch to routes comparison tab', async () => {
    localStorage.setItem('userId', 'test-user-id');
    // Provide full routeStats data that RoutesTab expects
    const statsWithFullRouteData = {
      ...mockStatsWithData,
      routeStats: [
        {
          routeId: 'route-1',
          routeName: '강남 출근길',
          totalSessions: 7,
          averageTotalDuration: 40,
          averageTotalWaitTime: 5,
          averageDelay: 1,
          waitTimePercentage: 12,
          checkpointStats: [],
          bottleneckCheckpoint: undefined,
          mostVariableCheckpoint: undefined,
        },
      ],
    };
    mockCommuteApi.getStats.mockResolvedValue(statsWithFullRouteData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '경로 비교' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: '경로 비교' }));

    // RoutesTab should render route buttons
    await waitFor(() => {
      expect(screen.getByText('강남 출근길')).toBeInTheDocument();
    });
  });

  // --- Navigation links ---

  it('should show cross-link to alerts', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('알림 설정하기')).toBeInTheDocument();
    });
  });

  it('should show navigation links to tracking and route setup', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('트래킹')).toBeInTheDocument();
    });
    expect(screen.getByText('경로 설정')).toBeInTheDocument();
  });

  // --- Back button ---

  it('should have a back button', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('뒤로 가기')).toBeInTheDocument();
    });
  });

  // --- Footer ---

  it('should show footer', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출퇴근 메이트 · 출퇴근 통계')).toBeInTheDocument();
    });
  });

  // --- Error handling ---

  it('should show error message when data loading fails', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockRejectedValue(new Error('Network error'));
    mockCommuteApi.getHistory.mockRejectedValue(new Error('Network error'));
    mockCommuteApi.getUserAnalytics.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('대시보드 데이터를 불러올 수 없습니다.')).toBeInTheDocument();
    });
  });

  // --- Day of week chart ---

  it('should show day of week chart with data', async () => {
    localStorage.setItem('userId', 'test-user-id');
    mockCommuteApi.getStats.mockResolvedValue(mockStatsWithData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('요일별 패턴')).toBeInTheDocument();
    });
  });
});
