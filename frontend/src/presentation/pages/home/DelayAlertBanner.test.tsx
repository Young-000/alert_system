import { render, screen, fireEvent } from '@testing-library/react';
import { DelayAlertBanner } from './DelayAlertBanner';
import type { DelayStatusResponse } from '@infrastructure/api/commute-api.client';

// Mock the query hook
const mockUseRouteDelayStatus = vi.fn();
vi.mock('@infrastructure/query/use-delay-status-query', () => ({
  useRouteDelayStatus: (...args: unknown[]) => mockUseRouteDelayStatus(...args),
}));

function makeDelayStatus(
  overrides: Partial<DelayStatusResponse> = {},
): DelayStatusResponse {
  return {
    routeId: 'route-1',
    routeName: '강남 출근길',
    checkedAt: new Date().toISOString(),
    overallStatus: 'normal',
    totalExpectedDuration: 45,
    totalEstimatedDuration: 45,
    totalDelayMinutes: 0,
    segments: [],
    alternatives: [],
    ...overrides,
  };
}

function renderBanner(): ReturnType<typeof render> {
  return render(<DelayAlertBanner routeId="route-1" />);
}

describe('DelayAlertBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when status is normal', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({ overallStatus: 'normal' }),
      isLoading: false,
    });
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when loading', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('shows yellow banner for minor delay', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({
        overallStatus: 'minor_delay',
        totalDelayMinutes: 3,
      }),
      isLoading: false,
    });
    renderBanner();

    const banner = screen.getByTestId('delay-alert-banner');
    expect(banner).toHaveClass('delay-banner--minor_delay');
    expect(screen.getByText('경미한 지연')).toBeInTheDocument();
    expect(screen.getByText('약 3분 지연 예상')).toBeInTheDocument();
  });

  it('shows orange banner for delayed with alternatives', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({
        overallStatus: 'delayed',
        totalDelayMinutes: 7,
        segments: [
          {
            checkpointId: 'cp-1',
            checkpointName: '강남역',
            checkpointType: 'subway',
            lineInfo: '2호선',
            status: 'delayed',
            expectedWaitMinutes: 3,
            estimatedWaitMinutes: 10,
            delayMinutes: 7,
            source: 'realtime_api',
            lastUpdated: new Date().toISOString(),
          },
        ],
        alternatives: [
          {
            id: 'alt-1',
            triggerSegment: 'cp-1',
            triggerReason: '2호선 지연',
            description: '신분당선으로 우회',
            steps: [
              { action: 'walk', from: '강남역', to: '신논현역', durationMinutes: 5 },
              { action: 'subway', from: '신논현역', to: '판교역', line: '신분당선', durationMinutes: 15 },
            ],
            totalDurationMinutes: 20,
            originalDurationMinutes: 30,
            savingsMinutes: 10,
            confidence: 'high',
          },
        ],
      }),
      isLoading: false,
    });
    renderBanner();

    const banner = screen.getByTestId('delay-alert-banner');
    expect(banner).toHaveClass('delay-banner--delayed');
    expect(screen.getByText('지연 발생')).toBeInTheDocument();
    expect(screen.getByText('약 7분 지연 예상')).toBeInTheDocument();
  });

  it('shows red banner for severe delay', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({
        overallStatus: 'severe_delay',
        totalDelayMinutes: 15,
      }),
      isLoading: false,
    });
    renderBanner();

    const banner = screen.getByTestId('delay-alert-banner');
    expect(banner).toHaveClass('delay-banner--severe_delay');
    expect(screen.getByText('심각한 지연')).toBeInTheDocument();
    expect(screen.getByText('약 15분 지연 예상')).toBeInTheDocument();
  });

  it('shows unavailable state', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({ overallStatus: 'unavailable' }),
      isLoading: false,
    });
    renderBanner();

    const banner = screen.getByTestId('delay-alert-banner');
    expect(banner).toHaveClass('delay-banner--unavailable');
    expect(screen.getByText('운행 정보 없음')).toBeInTheDocument();
    expect(screen.getByText('실시간 운행 정보를 확인할 수 없습니다')).toBeInTheDocument();
  });

  it('shows segment details in expandable section', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({
        overallStatus: 'delayed',
        totalDelayMinutes: 7,
        segments: [
          {
            checkpointId: 'cp-1',
            checkpointName: '강남역',
            checkpointType: 'subway',
            lineInfo: '2호선',
            status: 'delayed',
            expectedWaitMinutes: 3,
            estimatedWaitMinutes: 10,
            delayMinutes: 7,
            source: 'realtime_api',
            lastUpdated: new Date().toISOString(),
          },
          {
            checkpointId: 'cp-2',
            checkpointName: '역삼역',
            checkpointType: 'subway',
            lineInfo: '2호선',
            status: 'normal',
            expectedWaitMinutes: 3,
            estimatedWaitMinutes: 3,
            delayMinutes: 0,
            source: 'realtime_api',
            lastUpdated: new Date().toISOString(),
          },
        ],
      }),
      isLoading: false,
    });
    renderBanner();

    // Toggle button exists
    const toggleBtn = screen.getByLabelText('지연 상세 펼치기');
    expect(toggleBtn).toBeInTheDocument();

    // Expand the details
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Only delayed segments show (not normal ones)
    const segmentsList = screen.getByTestId('delay-segments');
    expect(segmentsList).toBeInTheDocument();
    expect(screen.getByText('강남역')).toBeInTheDocument();
    expect(screen.getByText('2호선')).toBeInTheDocument();
    expect(screen.getByText(/지연 \+7분/)).toBeInTheDocument();
  });

  it('has correct ARIA role and live region', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({ overallStatus: 'minor_delay', totalDelayMinutes: 2 }),
      isLoading: false,
    });
    renderBanner();

    const banner = screen.getByTestId('delay-alert-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('shows alternatives section when expanded', () => {
    mockUseRouteDelayStatus.mockReturnValue({
      data: makeDelayStatus({
        overallStatus: 'delayed',
        totalDelayMinutes: 7,
        alternatives: [
          {
            id: 'alt-1',
            triggerSegment: 'cp-1',
            triggerReason: '2호선 지연',
            description: '신분당선으로 우회',
            steps: [
              { action: 'walk', from: '강남역', to: '신논현역', durationMinutes: 5 },
            ],
            totalDurationMinutes: 20,
            originalDurationMinutes: 30,
            savingsMinutes: 10,
            confidence: 'high',
          },
        ],
      }),
      isLoading: false,
    });
    renderBanner();

    // Expand
    fireEvent.click(screen.getByLabelText('지연 상세 펼치기'));

    expect(screen.getByText('대안 경로')).toBeInTheDocument();
    expect(screen.getByText('신분당선으로 우회')).toBeInTheDocument();
    expect(screen.getByTestId('alternative-card')).toBeInTheDocument();
  });
});
