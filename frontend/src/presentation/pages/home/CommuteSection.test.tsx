import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommuteSection } from './CommuteSection';
import type { TransitArrivalInfo } from './route-utils';
import type { RouteCongestionResponse } from '@infrastructure/api/commute-api.client';

// Mock the congestion query hook
const mockUseRouteCongestion = vi.fn();
vi.mock('@infrastructure/query/use-congestion-query', () => ({
  useRouteCongestion: (...args: unknown[]) => mockUseRouteCongestion(...args),
}));

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

const defaultProps = {
  routes: [mockRoute],
  activeRoute: mockRoute,
  forceRouteType: 'auto' as const,
  onForceRouteTypeChange: vi.fn(),
  transitInfos: [] as TransitArrivalInfo[],
  isTransitRefreshing: false,
  lastTransitUpdate: null,
  isCommuteStarting: false,
  onStartCommute: vi.fn(),
};

function renderComponent(overrides = {}): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CommuteSection {...defaultProps} {...overrides} />
    </MemoryRouter>
  );
}

describe('CommuteSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouteCongestion.mockReturnValue({ data: undefined, isLoading: false });
  });

  // --- With active route ---

  it('should render route info when active route exists', () => {
    renderComponent();
    expect(screen.getByText('강남 출근길')).toBeInTheDocument();
    expect(screen.getByText('출근')).toBeInTheDocument();
    expect(screen.getByText('출발하기')).toBeInTheDocument();
  });

  it('should show checkpoint path', () => {
    renderComponent();
    // With 3 checkpoints, all names shown
    expect(screen.getByText(/집/)).toBeInTheDocument();
  });

  it('should call onStartCommute when clicking start button', () => {
    const onStartCommute = vi.fn();
    renderComponent({ onStartCommute });
    fireEvent.click(screen.getByText('출발하기'));
    expect(onStartCommute).toHaveBeenCalledTimes(1);
  });

  it('should disable start button while commute is starting', () => {
    renderComponent({ isCommuteStarting: true });
    expect(screen.getByText('시작 중...')).toBeInTheDocument();
    expect(screen.getByText('시작 중...').closest('button')).toBeDisabled();
  });

  // --- Route type toggle ---

  it('should show route type toggle when multiple routes exist', () => {
    const eveningRoute = {
      ...mockRoute,
      id: 'route-2',
      name: '퇴근길',
      routeType: 'evening' as const,
    };
    renderComponent({ routes: [mockRoute, eveningRoute] });

    expect(screen.getByText('자동')).toBeInTheDocument();
    // "출근" appears both in the toggle and badge, so use getAllByText
    expect(screen.getAllByText('출근').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('퇴근').length).toBeGreaterThanOrEqual(1);
  });

  it('should not show route type toggle with only one route', () => {
    renderComponent({ routes: [mockRoute] });
    expect(screen.queryByText('자동')).not.toBeInTheDocument();
  });

  it('should call onForceRouteTypeChange when clicking toggle', () => {
    const onForceRouteTypeChange = vi.fn();
    const eveningRoute = { ...mockRoute, id: 'route-2', routeType: 'evening' as const };
    renderComponent({
      routes: [mockRoute, eveningRoute],
      onForceRouteTypeChange,
    });

    fireEvent.click(screen.getByText('퇴근'));
    expect(onForceRouteTypeChange).toHaveBeenCalledWith('evening');
  });

  // --- Transit info ---

  it('should display transit arrival info', () => {
    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          {
            stationId: 'station-1',
            lineId: 'line-2',
            direction: '성수',
            arrivalTime: 3,
            destination: '성수',
          },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    expect(screen.getByText('실시간 교통')).toBeInTheDocument();
    expect(screen.getByText('지하철')).toBeInTheDocument();
    expect(screen.getByText('강남역')).toBeInTheDocument();
    expect(screen.getByText(/성수행 3분/)).toBeInTheDocument();
  });

  it('should show arriving soon indicator', () => {
    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          {
            stationId: 'station-1',
            lineId: 'line-2',
            direction: '성수',
            arrivalTime: 1,
            destination: '성수',
          },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });
    // arrivalTime <= 2 is "arriving soon"
    expect(screen.getByText(/성수행 1분/)).toBeInTheDocument();
  });

  it('should show loading spinner for transit info', () => {
    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [],
        isLoading: true,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });
    expect(screen.getByText('강남역')).toBeInTheDocument();
  });

  it('should show refreshing status', () => {
    renderComponent({
      transitInfos: [{ type: 'subway', name: '강남역', arrivals: [], isLoading: false }],
      isTransitRefreshing: true,
      lastTransitUpdate: Date.now(),
    });
    expect(screen.getByText('갱신 중...')).toBeInTheDocument();
  });

  it('should show transit error message', () => {
    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [],
        isLoading: false,
        error: '데이터 없음',
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });
    expect(screen.getByText('데이터 없음')).toBeInTheDocument();
  });

  // --- No route (empty state) ---

  it('should show onboarding CTA when no active route', () => {
    renderComponent({ activeRoute: null, routes: [] });

    expect(screen.getByText('출근 경로를 등록해보세요')).toBeInTheDocument();
    expect(screen.getByText('경로를 등록하면 날씨, 도착정보, 기록이 자동으로 연결됩니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '경로 등록하기' })).toHaveAttribute('href', '/routes');
  });

  // --- Bus arrival ---

  it('should display bus arrival info', () => {
    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'bus',
        name: '강남역 정류장',
        arrivals: [
          {
            stopId: 'stop-1',
            routeId: 'bus-route-1',
            routeName: '472',
            arrivalTime: 5,
            remainingStops: 3,
          },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    expect(screen.getByText('버스')).toBeInTheDocument();
    expect(screen.getByText('강남역 정류장')).toBeInTheDocument();
    expect(screen.getByText(/472 5분/)).toBeInTheDocument();
  });

  // --- Congestion integration ---

  it('should show congestion chip next to transit item when data is available', () => {
    const congestionData: RouteCongestionResponse = {
      routeId: 'route-1',
      routeName: '강남 출근길',
      timeSlot: 'morning_rush',
      timeSlotLabel: '오전 러시',
      checkpoints: [
        {
          checkpointId: 'cp-2',
          checkpointName: '강남역',
          sequenceOrder: 2,
          congestion: {
            segmentKey: 'subway_gangnam_2',
            avgWaitMinutes: 7.2,
            avgDelayMinutes: 4.8,
            congestionLevel: 'high',
            confidence: 0.78,
            sampleCount: 23,
          },
        },
      ],
      overallCongestion: 'high',
      totalEstimatedDelay: 4.8,
      lastCalculatedAt: new Date().toISOString(),
    };
    mockUseRouteCongestion.mockReturnValue({ data: congestionData, isLoading: false });

    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          { stationId: 'station-1', lineId: 'line-2', direction: '성수', arrivalTime: 3, destination: '성수' },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    const congestionChip = screen.getByTestId('transit-congestion');
    expect(congestionChip).toBeInTheDocument();
    expect(screen.getByText('혼잡')).toBeInTheDocument();
  });

  it('should not show congestion chip when congestion data is undefined', () => {
    mockUseRouteCongestion.mockReturnValue({ data: undefined, isLoading: false });

    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          { stationId: 'station-1', lineId: 'line-2', direction: '성수', arrivalTime: 3, destination: '성수' },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    expect(screen.queryByTestId('transit-congestion')).not.toBeInTheDocument();
  });

  it('should not show congestion chip when checkpoint has no congestion data', () => {
    const congestionData: RouteCongestionResponse = {
      routeId: 'route-1',
      routeName: '강남 출근길',
      timeSlot: 'morning_rush',
      timeSlotLabel: '오전 러시',
      checkpoints: [
        {
          checkpointId: 'cp-2',
          checkpointName: '강남역',
          sequenceOrder: 2,
          congestion: null,
        },
      ],
      overallCongestion: 'low',
      totalEstimatedDelay: 0,
      lastCalculatedAt: new Date().toISOString(),
    };
    mockUseRouteCongestion.mockReturnValue({ data: congestionData, isLoading: false });

    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          { stationId: 'station-1', lineId: 'line-2', direction: '성수', arrivalTime: 3, destination: '성수' },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    expect(screen.queryByTestId('transit-congestion')).not.toBeInTheDocument();
  });

  it('should show "수집 중" when sample count is below threshold', () => {
    const congestionData: RouteCongestionResponse = {
      routeId: 'route-1',
      routeName: '강남 출근길',
      timeSlot: 'morning_rush',
      timeSlotLabel: '오전 러시',
      checkpoints: [
        {
          checkpointId: 'cp-2',
          checkpointName: '강남역',
          sequenceOrder: 2,
          congestion: {
            segmentKey: 'subway_gangnam_2',
            avgWaitMinutes: 5,
            avgDelayMinutes: 2,
            congestionLevel: 'moderate',
            confidence: 0.3,
            sampleCount: 2,
          },
        },
      ],
      overallCongestion: 'moderate',
      totalEstimatedDelay: 2,
      lastCalculatedAt: new Date().toISOString(),
    };
    mockUseRouteCongestion.mockReturnValue({ data: congestionData, isLoading: false });

    const transitInfos: TransitArrivalInfo[] = [
      {
        type: 'subway',
        name: '강남역',
        arrivals: [
          { stationId: 'station-1', lineId: 'line-2', direction: '성수', arrivalTime: 3, destination: '성수' },
        ],
        isLoading: false,
      },
    ];

    renderComponent({ transitInfos, lastTransitUpdate: Date.now() });

    expect(screen.getByTestId('transit-congestion')).toBeInTheDocument();
    expect(screen.getByText('수집 중')).toBeInTheDocument();
  });
});
