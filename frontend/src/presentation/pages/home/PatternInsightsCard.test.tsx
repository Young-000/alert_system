import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { PatternInsightsCard } from './PatternInsightsCard';
import { behaviorApiClient } from '@infrastructure/api';
import type { Mocked } from 'vitest';

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

const mockBehaviorApi = behaviorApiClient as Mocked<typeof behaviorApiClient>;

describe('PatternInsightsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userId', 'test-user-id');
  });

  it('cold_start 상태면 진행률 바와 안내 메시지를 표시한다', async () => {
    mockBehaviorApi.getPrediction.mockResolvedValue({
      departureTime: '00:00',
      confidence: 0.1,
      tier: 'cold_start',
      departureRange: { early: '00:00', late: '00:00' },
      contributingFactors: [],
      dataStatus: { totalRecords: 2, tier: 'cold_start', nextTierAt: 5, nextTierName: 'basic' },
    });

    render(
      <TestProviders>
        <PatternInsightsCard />
      </TestProviders>,
    );

    expect(await screen.findByText('출퇴근 기록을 쌓아보세요!')).toBeInTheDocument();
    expect(screen.getByText('2/5 기록')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('learning 상태(day_aware)면 평균 출발 시간과 신뢰도를 표시한다', async () => {
    mockBehaviorApi.getPrediction.mockResolvedValue({
      departureTime: '08:05',
      confidence: 0.72,
      tier: 'day_aware',
      departureRange: { early: '07:55', late: '08:15' },
      contributingFactors: [
        { type: 'day_of_week', label: '월요일 패턴', impact: -3, description: '월요일은 평균보다 3분 일찍 출발', confidence: 0.8 },
      ],
      dataStatus: { totalRecords: 15, tier: 'day_aware', nextTierAt: 20, nextTierName: 'weather_aware' },
    });

    render(
      <TestProviders>
        <PatternInsightsCard />
      </TestProviders>,
    );

    expect(await screen.findByText('08:05')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('월요일 패턴')).toBeInTheDocument();
    expect(screen.getByText('-3분')).toBeInTheDocument();
    expect(screen.getByText('패턴 분석 보기')).toBeInTheDocument();
  });

  it('full 상태면 예상 출발 범위와 여러 요인을 표시한다', async () => {
    mockBehaviorApi.getPrediction.mockResolvedValue({
      departureTime: '08:10',
      confidence: 0.88,
      tier: 'weather_aware',
      departureRange: { early: '08:00', late: '08:20' },
      contributingFactors: [
        { type: 'day_of_week', label: '수요일 패턴', impact: -2, description: 'test', confidence: 0.9 },
        { type: 'weather', label: '비 영향', impact: -8, description: 'test', confidence: 0.7 },
      ],
      dataStatus: { totalRecords: 25, tier: 'weather_aware', nextTierAt: 50, nextTierName: 'full' },
    });

    render(
      <TestProviders>
        <PatternInsightsCard />
      </TestProviders>,
    );

    expect(await screen.findByText('08:10')).toBeInTheDocument();
    expect(screen.getByText('08:00 ~ 08:20')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('수요일 패턴')).toBeInTheDocument();
    expect(screen.getByText('비 영향')).toBeInTheDocument();
  });

  it('비로그인 상태면 아무것도 렌더링하지 않는다', () => {
    localStorage.clear(); // userId removed => useAuth returns ''

    const { container } = render(
      <TestProviders>
        <PatternInsightsCard />
      </TestProviders>,
    );

    expect(container.innerHTML).toBe('');
  });
});
