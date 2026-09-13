import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NeighborSection } from './NeighborSection';

// Mock the community query hook
const mockUseNeighborStats = vi.fn();
vi.mock('@infrastructure/query/use-community-query', () => ({
  useNeighborStats: (...args: unknown[]) => mockUseNeighborStats(...args),
}));

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('NeighborSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when loading', () => {
    mockUseNeighborStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(container.innerHTML).toBe('');
  });

  // 조회 실패는 data=undefined로 들어온다. 그대로 숨기면 "이웃이 없다"가 아니라
  // 기능 자체가 없는 것처럼 읽힌다 — 같은 화면의 CheckpointTips와 같은 계약으로
  // 실패는 실패라고 말하고 그 자리에 다음 행동을 하나 남긴다.
  it('shows a failure notice instead of hiding the section on error', () => {
    mockUseNeighborStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByText('이웃 정보를 불러올 수 없습니다')).toBeInTheDocument();
  });

  it('retries the query when the retry button is clicked', () => {
    const refetch = vi.fn();
    mockUseNeighborStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // 로딩 중에는 아직 실패가 아니다. 실패 문구가 조회 중에 스쳐 보이면 안 된다.
  it('returns null while loading even if a previous error is set', () => {
    mockUseNeighborStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: true,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when dataStatus is no_route', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: null,
        neighborCount: 0,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'no_route',
      },
      isLoading: false,
      isError: false,
    });

    const { container } = renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(container.innerHTML).toBe('');
  });

  it('shows insufficient data message when dataStatus is insufficient', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 2,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'insufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByText('아직 이웃 데이터가 부족해요')).toBeInTheDocument();
  });

  it('shows neighbor count when data is sufficient', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 23,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByText('23명')).toBeInTheDocument();
    expect(screen.getByText(/비슷한 경로로 출퇴근해요/)).toBeInTheDocument();
  });

  it('shows neighbor average duration', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 23,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByText('42분')).toBeInTheDocument();
  });

  it('shows positive diff when user is slower', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 10,
        avgDurationMinutes: 35,
        myAvgDurationMinutes: 40,
        diffMinutes: 5,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    const diffEl = screen.getByText('(+5분)');
    expect(diffEl).toBeInTheDocument();
    expect(diffEl.className).toContain('neighbor-diff--slower');
  });

  it('shows negative diff when user is faster', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 10,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    const diffEl = screen.getByText('(-4분)');
    expect(diffEl).toBeInTheDocument();
    expect(diffEl.className).toContain('neighbor-diff--faster');
  });

  it('has proper aria-label on section', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 5,
        avgDurationMinutes: 30,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByLabelText('경로 이웃 정보')).toBeInTheDocument();
  });

  it('hides comparison when myAvgDurationMinutes is null', () => {
    mockUseNeighborStats.mockReturnValue({
      data: {
        routeId: 'route-1',
        neighborCount: 5,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'sufficient',
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<NeighborSection routeId="route-1" />);
    expect(screen.getByText('42분')).toBeInTheDocument();
    expect(screen.queryByText(/내 평균/)).not.toBeInTheDocument();
  });
});
