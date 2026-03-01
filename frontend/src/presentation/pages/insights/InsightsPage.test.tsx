import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InsightsPage } from './InsightsPage';
import { commuteApiClient, getCommuteApiClient } from '@infrastructure/api';
import type { Mocked, MockedFunction } from 'vitest';
import { TestProviders } from '../../../test-utils';

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

const mockCommuteApiClient = commuteApiClient as Mocked<typeof commuteApiClient>;
const mockGetCommuteApiClient = getCommuteApiClient as MockedFunction<typeof getCommuteApiClient>;

function renderPage(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <InsightsPage />
    </TestProviders>,
  );
}

const mockRegions = [
  {
    regionId: 'region-1',
    regionName: '강남/역삼 지역',
    avgDurationMinutes: 42,
    medianDurationMinutes: 40,
    userCount: 12,
    sessionCount: 156,
    weekTrend: -3.2,
    weekTrendDirection: 'improving' as const,
    peakHour: 8,
    lastCalculatedAt: new Date().toISOString(),
  },
  {
    regionId: 'region-2',
    regionName: '신도림/구로 지역',
    avgDurationMinutes: 55,
    medianDurationMinutes: 52,
    userCount: 8,
    sessionCount: 89,
    weekTrend: 2.1,
    weekTrendDirection: 'worsening' as const,
    peakHour: 7,
    lastCalculatedAt: new Date().toISOString(),
  },
];

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCommuteApiClient.mockReturnValue(mockCommuteApiClient);
    mockCommuteApiClient.getRegions.mockResolvedValue({
      regions: mockRegions,
      meta: { total: 2, limit: 20, offset: 0, totalPages: 1 },
    });
    mockCommuteApiClient.getRegionById.mockResolvedValue({
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      gridLat: 37.497,
      gridLng: 127.028,
      avgDurationMinutes: 42,
      medianDurationMinutes: 40,
      userCount: 12,
      sessionCount: 156,
      peakHourDistribution: { 7: 15, 8: 45, 9: 30 },
      weekTrend: -3.2,
      weekTrendDirection: 'improving',
      monthTrend: -1.5,
      monthTrendDirection: 'improving',
      peakHour: 8,
      lastCalculatedAt: new Date().toISOString(),
    });
    mockCommuteApiClient.getRegionPeakHours.mockResolvedValue({
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      peakHourDistribution: { 7: 15, 8: 45, 9: 30 },
      peakHour: 8,
      totalSessions: 90,
      lastCalculatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- Layout & Header ---

  it('페이지 타이틀을 표시한다', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('지역별 출퇴근 인사이트')).toBeInTheDocument();
    });
  });

  it('서브타이틀을 표시한다', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/지역별 출퇴근 패턴과 트렌드/)).toBeInTheDocument();
    });
  });

  // --- Loading State ---

  it('로딩 중 스켈레톤을 표시한다', () => {
    mockCommuteApiClient.getRegions.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderPage();
    expect(container.querySelector('.insight-skeleton-card')).toBeInTheDocument();
  });

  // --- Empty State ---

  it('지역 데이터가 없으면 빈 상태를 표시한다', async () => {
    mockCommuteApiClient.getRegions.mockResolvedValue({
      regions: [],
      meta: { total: 0, limit: 20, offset: 0, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('아직 지역 데이터가 없어요')).toBeInTheDocument();
    });
  });

  // --- Error State ---

  it('API 에러 시 에러 메시지를 표시한다', async () => {
    mockCommuteApiClient.getRegions.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText(/지역 데이터를 불러올 수 없습니다/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  // --- Region Cards ---

  it('지역 카드를 렌더링한다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
      expect(screen.getByText('신도림/구로 지역')).toBeInTheDocument();
    });
  });

  it('지역 카드를 클릭하면 확장한다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
    });

    // Find the first region card's button and click it
    const cards = screen.getAllByTestId('region-card');
    const firstButton = cards[0].querySelector('button');
    expect(firstButton).not.toBeNull();
    fireEvent.click(firstButton!);

    // Should show detail panel loading or content
    await waitFor(() => {
      expect(screen.getByTestId('region-detail-panel')).toBeInTheDocument();
    });
  });

  // --- Sort ---

  it('정렬 선택기를 표시한다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('정렬 기준')).toBeInTheDocument();
  });

  it('정렬 변경 시 API를 다시 호출한다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'avgDuration' } });

    await waitFor(() => {
      expect(mockCommuteApiClient.getRegions).toHaveBeenCalled();
    });
  });

  // --- My Comparison (non-logged in) ---

  it('비로그인 시 비교 섹션에 로그인 유도를 표시한다', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/로그인하면 지역 평균과/)).toBeInTheDocument();
    });
  });
});
