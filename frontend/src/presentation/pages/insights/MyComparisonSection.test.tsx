import { render, screen, waitFor } from '@testing-library/react';
import { MyComparisonSection } from './MyComparisonSection';
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

function renderSection(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <MyComparisonSection />
    </TestProviders>,
  );
}

describe('MyComparisonSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetCommuteApiClient.mockReturnValue(mockCommuteApiClient);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('비로그인 시 로그인 유도를 표시한다', () => {
    renderSection();
    expect(screen.getByText(/로그인하면 지역 평균과/)).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  it('로그인 후 데이터가 없으면 경로 설정 유도를 표시한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockResolvedValue({
      userId: 'test-user',
      userAvgDurationMinutes: 0,
      userSessionCount: 0,
      regionId: null,
      regionName: '',
      regionAvgDurationMinutes: 0,
      regionMedianDurationMinutes: 0,
      regionUserCount: 0,
      diffMinutes: 0,
      diffPercent: 0,
      fasterThanRegion: false,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/출퇴근을 기록하면/)).toBeInTheDocument();
    });
    expect(screen.getByText('경로 설정하기')).toBeInTheDocument();
  });

  it('비교 데이터가 있으면 나의 평균과 지역 평균을 표시한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockResolvedValue({
      userId: 'test-user',
      userAvgDurationMinutes: 38,
      userSessionCount: 15,
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      regionAvgDurationMinutes: 42,
      regionMedianDurationMinutes: 40,
      regionUserCount: 12,
      diffMinutes: -4,
      diffPercent: -9.5,
      fasterThanRegion: true,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('강남/역삼 지역')).toBeInTheDocument();
    });
    expect(screen.getByText('38분')).toBeInTheDocument();
    expect(screen.getByText('42분')).toBeInTheDocument();
  });

  it('지역 평균보다 빠르면 "빠름" 표시와 초록색 스타일을 적용한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockResolvedValue({
      userId: 'test-user',
      userAvgDurationMinutes: 38,
      userSessionCount: 15,
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      regionAvgDurationMinutes: 42,
      regionMedianDurationMinutes: 40,
      regionUserCount: 12,
      diffMinutes: -4,
      diffPercent: -9.5,
      fasterThanRegion: true,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('4분 빠름')).toBeInTheDocument();
    });
    const result = screen.getByText('4분 빠름').closest('.insight-comparison-result');
    expect(result).toHaveClass('insight-diff--faster');
  });

  it('지역 평균보다 느리면 "느림" 표시와 빨간색 스타일을 적용한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockResolvedValue({
      userId: 'test-user',
      userAvgDurationMinutes: 48,
      userSessionCount: 10,
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      regionAvgDurationMinutes: 42,
      regionMedianDurationMinutes: 40,
      regionUserCount: 12,
      diffMinutes: 6,
      diffPercent: 14.3,
      fasterThanRegion: false,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText('6분 느림')).toBeInTheDocument();
    });
    const result = screen.getByText('6분 느림').closest('.insight-comparison-result');
    expect(result).toHaveClass('insight-diff--slower');
  });

  it('메타 정보를 표시한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockResolvedValue({
      userId: 'test-user',
      userAvgDurationMinutes: 38,
      userSessionCount: 15,
      regionId: 'region-1',
      regionName: '강남/역삼 지역',
      regionAvgDurationMinutes: 42,
      regionMedianDurationMinutes: 40,
      regionUserCount: 12,
      diffMinutes: -4,
      diffPercent: -9.5,
      fasterThanRegion: true,
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/15회 기록 기준/)).toBeInTheDocument();
    });
  });

  it('API 에러 시 에러 메시지를 표시한다', async () => {
    localStorage.setItem('userId', 'test-user');
    mockCommuteApiClient.getMyComparison.mockRejectedValue(new Error('Network error'));

    renderSection();

    await waitFor(
      () => {
        expect(screen.getByText('비교 데이터를 불러올 수 없습니다')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
