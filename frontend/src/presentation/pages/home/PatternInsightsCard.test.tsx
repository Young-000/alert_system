import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { PatternInsightsCard } from './PatternInsightsCard';
import { behaviorApiClient } from '@infrastructure/api';
// 상대 경로 import — `vitest.config.ts:39-40`이 `@infrastructure/api/*`를 전부
// 목 배럴로 보내므로 별칭으로 가져오면 변환 함수가 목으로 접힌다.
import { toPredictionResponse } from '../../../infrastructure/api/behavior-response-adapter';
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

/**
 * 픽스처는 서버가 보내는 모양(`factors`·`dataStatus.recordsUsed`)에서 출발해
 * 실제 변환을 통과시킨다. 이 카드는 `contributingFactors`를 그대로 인덱싱하는데
 * (`PatternInsightsCard.tsx:57,108`) 서버는 그 키를 보낸 적이 없다 —
 * 지어낸 픽스처가 홈 화면이 죽는 것을 오래 가려 왔다.
 */
function serverPrediction(overrides: {
  departureTime: string;
  confidence: number;
  tier: 'cold_start' | 'basic' | 'day_aware' | 'weather_aware' | 'full';
  departureRange: { early: string; late: string };
  factors: Array<{ type: string; label: string; impact: number; description: string; confidence: number }>;
  dataStatus: { totalRecords: number; nextTierAt: number; nextTierName: string };
}) {
  return toPredictionResponse({
    departureTime: overrides.departureTime,
    departureRange: overrides.departureRange,
    confidence: overrides.confidence,
    tier: overrides.tier,
    factors: overrides.factors,
    dataStatus: {
      totalRecords: overrides.dataStatus.totalRecords,
      recordsUsed: overrides.dataStatus.totalRecords,
      nextTierAt: overrides.dataStatus.nextTierAt,
      nextTierName: overrides.dataStatus.nextTierName,
    },
  });
}

describe('PatternInsightsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userId', 'test-user-id');
  });

  it('cold_start 상태면 진행률 바와 안내 메시지를 표시한다', async () => {
    mockBehaviorApi.getPrediction.mockResolvedValue(
      serverPrediction({
        departureTime: '00:00',
        confidence: 0.1,
        tier: 'cold_start',
        departureRange: { early: '00:00', late: '00:00' },
        factors: [],
        dataStatus: { totalRecords: 2, nextTierAt: 5, nextTierName: 'basic' },
      }),
    );

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
    mockBehaviorApi.getPrediction.mockResolvedValue(
      serverPrediction({
        departureTime: '08:05',
        confidence: 0.72,
        tier: 'day_aware',
        departureRange: { early: '07:55', late: '08:15' },
        factors: [
          { type: 'day_of_week', label: '월요일 패턴', impact: -3, description: '월요일은 평균보다 3분 일찍 출발', confidence: 0.8 },
        ],
        dataStatus: { totalRecords: 15, nextTierAt: 20, nextTierName: 'weather_aware' },
      }),
    );

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
    mockBehaviorApi.getPrediction.mockResolvedValue(
      serverPrediction({
        departureTime: '08:10',
        confidence: 0.88,
        tier: 'weather_aware',
        departureRange: { early: '08:00', late: '08:20' },
        factors: [
          { type: 'day_of_week', label: '수요일 패턴', impact: -2, description: 'test', confidence: 0.9 },
          { type: 'weather', label: '비 영향', impact: -8, description: 'test', confidence: 0.7 },
        ],
        dataStatus: { totalRecords: 25, nextTierAt: 50, nextTierName: 'full' },
      }),
    );

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
