import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckpointTips } from './CheckpointTips';
import type { CommunityTip } from '@infrastructure/api/commute-api.client';

// Mock community query hooks
const mockUseCheckpointTips = vi.fn();
const mockCreateTipMutate = vi.fn();
const mockMarkHelpfulMutate = vi.fn();
const mockReportTipMutate = vi.fn();

vi.mock('@infrastructure/query/use-community-query', () => ({
  useCheckpointTips: (...args: unknown[]) => mockUseCheckpointTips(...args),
  useCreateTip: () => ({
    mutate: mockCreateTipMutate,
    isPending: false,
  }),
  useMarkHelpful: () => ({
    mutate: mockMarkHelpfulMutate,
    isPending: false,
  }),
  useReportTip: () => ({
    mutate: mockReportTipMutate,
    isPending: false,
  }),
}));

const sampleTips: CommunityTip[] = [
  {
    id: 'tip-1',
    content: '4번 출구가 빨라요',
    helpfulCount: 5,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    isHelpfulByMe: false,
    isReportedByMe: false,
  },
  {
    id: 'tip-2',
    content: '에스컬레이터 고장 주의',
    helpfulCount: 2,
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    isHelpfulByMe: true,
    isReportedByMe: false,
  },
];

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('CheckpointTips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );
    expect(screen.getByText('팁을 불러오는 중...')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const refetch = vi.fn();
    mockUseCheckpointTips.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );
    expect(screen.getByText('팁을 불러올 수 없습니다')).toBeInTheDocument();

    fireEvent.click(screen.getByText('다시 시도'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows empty state when no tips', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: [], total: 0, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );
    expect(screen.getByText(/아직 팁이 없어요/)).toBeInTheDocument();
  });

  it('renders tips list with count', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: sampleTips, total: 2, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );
    expect(screen.getByText('강남역 팁')).toBeInTheDocument();
    expect(screen.getByText('2개')).toBeInTheDocument();
    expect(screen.getByText('4번 출구가 빨라요')).toBeInTheDocument();
    expect(screen.getByText('에스컬레이터 고장 주의')).toBeInTheDocument();
  });

  it('shows tip form when logged in', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: [], total: 0, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips
        checkpointKey="station:1"
        checkpointName="강남역"
        isLoggedIn
      />,
    );
    expect(screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/)).toBeInTheDocument();
  });

  it('hides tip form when not logged in', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: [], total: 0, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips
        checkpointKey="station:1"
        checkpointName="강남역"
        isLoggedIn={false}
      />,
    );
    expect(screen.queryByPlaceholderText(/이 구간 팁을 남겨보세요/)).not.toBeInTheDocument();
  });

  it('shows eligibility message when not eligible', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: [], total: 0, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips
        checkpointKey="station:1"
        checkpointName="강남역"
        isLoggedIn
        isEligible={false}
      />,
    );
    expect(screen.getByText(/3회 이상 출퇴근 기록 후/)).toBeInTheDocument();
  });

  it('calls markHelpful mutation on helpful click', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: sampleTips, total: 2, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );

    const helpfulBtns = screen.getAllByLabelText(/도움이 됐어요/);
    fireEvent.click(helpfulBtns[0]);
    expect(mockMarkHelpfulMutate).toHaveBeenCalledWith('tip-1');
  });

  it('calls reportTip mutation on report confirm', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: sampleTips, total: 2, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );

    const reportBtns = screen.getAllByLabelText('이 팁 신고하기');
    fireEvent.click(reportBtns[0]);
    fireEvent.click(screen.getByText('확인'));
    expect(mockReportTipMutate).toHaveBeenCalledWith('tip-1');
  });

  it('has proper aria-label on section', () => {
    mockUseCheckpointTips.mockReturnValue({
      data: { tips: [], total: 0, page: 1, limit: 20, hasNext: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithProviders(
      <CheckpointTips checkpointKey="station:1" checkpointName="강남역" />,
    );
    expect(screen.getByLabelText('강남역 팁')).toBeInTheDocument();
  });
});
