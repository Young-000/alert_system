import { render, screen } from '@testing-library/react';
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

  it('returns null on error', () => {
    mockUseNeighborStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
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
