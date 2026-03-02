import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatsSection } from './StatsSection';
import type { CommuteStatsResponse } from '@infrastructure/api/commute-api.client';

vi.mock('@infrastructure/api');

const mockRoute = {
  id: 'route-1',
  userId: 'test-user-id',
  name: '강남 출근길',
  routeType: 'morning' as const,
  isPreferred: true,
  totalExpectedDuration: 45,
  totalTransferTime: 5,
  pureMovementTime: 40,
  checkpoints: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockStatsWithData: CommuteStatsResponse = {
  userId: 'test-user-id',
  totalSessions: 10,
  recentSessions: 3,
  overallAverageDuration: 42,
  overallAverageWaitTime: 5,
  overallAverageDelay: 2,
  waitTimePercentage: 12,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [],
  insights: ['화요일이 평균적으로 가장 빠릅니다'],
};

const mockEmptyStats: CommuteStatsResponse = {
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

const defaultProps = {
  commuteStats: mockStatsWithData,
  routes: [mockRoute],
  activeRouteId: 'route-1',
  onNavigateToRoutes: vi.fn(),
};

function renderComponent(overrides = {}): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <StatsSection {...defaultProps} {...overrides} />
    </MemoryRouter>,
  );
}

describe('StatsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // --- With stats ---

  it('should show summary text with stats', () => {
    renderComponent();
    expect(screen.getByText('이번 주')).toBeInTheDocument();
    // Summary text should contain average and count
    expect(screen.getByText(/평균 42분/)).toBeInTheDocument();
  });

  it('should show section label', () => {
    renderComponent();
    expect(screen.getByRole('region', { name: '이번 주 통근' })).toBeInTheDocument();
  });

  // --- Without stats ---

  it('should show empty text when no stats', () => {
    renderComponent({ commuteStats: mockEmptyStats });
    expect(screen.getByText('이번 주 출퇴근 기록 없음')).toBeInTheDocument();
  });

  it('should show empty text when stats are null', () => {
    renderComponent({ commuteStats: null });
    expect(screen.getByText('이번 주 출퇴근 기록 없음')).toBeInTheDocument();
  });

  // --- Other routes ---

  it('should show other routes chips when multiple routes exist', () => {
    const eveningRoute = {
      ...mockRoute,
      id: 'route-2',
      name: '퇴근길',
      routeType: 'evening' as const,
    };
    renderComponent({ routes: [mockRoute, eveningRoute] });

    expect(screen.getByText(/퇴근길 보기/)).toBeInTheDocument();
  });

  it('should call onNavigateToRoutes when clicking other route chip', () => {
    const onNavigateToRoutes = vi.fn();
    const eveningRoute = {
      ...mockRoute,
      id: 'route-2',
      name: '퇴근길',
      routeType: 'evening' as const,
    };
    renderComponent({ routes: [mockRoute, eveningRoute], onNavigateToRoutes });

    fireEvent.click(screen.getByText(/퇴근길 보기/));
    expect(onNavigateToRoutes).toHaveBeenCalledTimes(1);
  });

  it('should not show other routes section with only one route', () => {
    renderComponent({ routes: [mockRoute] });
    expect(screen.queryByText('다른 경로 보기')).not.toBeInTheDocument();
  });

  // --- Dashboard link ---

  it('should have link to dashboard', () => {
    // Need to expand the section first since it defaults to collapsed
    renderComponent();

    // The collapsible section starts collapsed; toggle it
    const toggle = screen.getByLabelText(/통계 상세 펼치기/);
    fireEvent.click(toggle);

    expect(screen.getByText('자세히 보기')).toBeInTheDocument();
  });
});
