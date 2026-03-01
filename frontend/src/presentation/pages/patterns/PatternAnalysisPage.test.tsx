import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { PatternAnalysisPage } from './PatternAnalysisPage';
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

const mockPrediction = {
  departureTime: '08:05',
  confidence: 0.72,
  tier: 'day_aware' as const,
  departureRange: { early: '07:55', late: '08:15' },
  contributingFactors: [
    { type: 'day_of_week', label: '월요일 패턴', impact: -3, description: '월요일은 평균보다 3분 일찍 출발', confidence: 0.8 },
    { type: 'weather', label: '비 영향', impact: -8, description: '비 올 때 일찍 출발', confidence: 0.65 },
  ],
  dataStatus: { totalRecords: 15, tier: 'day_aware' as const, nextTierAt: 20, nextTierName: 'weather_aware' },
};

const mockInsights = {
  dayOfWeek: {
    segments: [
      { dayOfWeek: 1, dayName: '월', avgMinutes: 485, stdDevMinutes: 4, sampleCount: 3 },
      { dayOfWeek: 2, dayName: '화', avgMinutes: 490, stdDevMinutes: 3, sampleCount: 3 },
      { dayOfWeek: 3, dayName: '수', avgMinutes: 488, stdDevMinutes: 2, sampleCount: 3 },
      { dayOfWeek: 4, dayName: '목', avgMinutes: 492, stdDevMinutes: 5, sampleCount: 3 },
      { dayOfWeek: 5, dayName: '금', avgMinutes: 500, stdDevMinutes: 9, sampleCount: 3 },
    ],
    mostConsistentDay: { dayOfWeek: 3, dayName: '수', stdDevMinutes: 2 },
    mostVariableDay: { dayOfWeek: 5, dayName: '금', stdDevMinutes: 9 },
  },
  weatherSensitivity: {
    level: 'medium' as const,
    rainImpact: -8,
    snowImpact: -14,
    temperatureImpact: -1,
    comparedToAverage: { rainDelta: -2, description: '비 영향이 평균보다 2분 적음' },
  },
  summary: {
    totalRecords: 15,
    tier: 'day_aware' as const,
    averageDeparture: '08:05',
    overallStdDev: 6,
    confidence: 0.72,
  },
};

describe('PatternAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userId', 'test-user-id');
    mockBehaviorApi.getPrediction.mockResolvedValue(mockPrediction);
    mockBehaviorApi.getInsights.mockResolvedValue(mockInsights);
  });

  it('개요 탭이 기본 선택되어 요약 정보를 표시한다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    expect(await screen.findByText('출발 패턴 요약')).toBeInTheDocument();
    expect(screen.getByText('08:05')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('15회')).toBeInTheDocument();
    expect(screen.getByText('6분')).toBeInTheDocument();
  });

  it('개요 탭에서 분석 수준 배지와 영향 요인을 표시한다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    expect(await screen.findByText('요일 인식')).toBeInTheDocument();
    expect(screen.getByText('월요일 패턴')).toBeInTheDocument();
    expect(screen.getByText('-3분')).toBeInTheDocument();
    expect(screen.getByText('비 영향')).toBeInTheDocument();
    expect(screen.getByText('-8분')).toBeInTheDocument();
  });

  it('요일별 탭으로 전환하면 요일별 차트가 표시된다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');

    const byDayTab = screen.getByRole('tab', { name: '요일별' });
    fireEvent.click(byDayTab);

    expect(await screen.findByText('요일별 출발 시간')).toBeInTheDocument();
    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('금')).toBeInTheDocument();
  });

  it('요일별 탭에서 가장 일정한/불규칙한 요일을 표시한다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');

    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    await waitFor(() => {
      expect(screen.getByText(/가장 일정한 요일/)).toBeInTheDocument();
    });
    expect(screen.getByText(/수요일/)).toBeInTheDocument();
    expect(screen.getByText(/가장 불규칙한 요일/)).toBeInTheDocument();
    expect(screen.getByText(/금요일/)).toBeInTheDocument();
  });

  it('날씨 탭으로 전환하면 날씨 민감도 정보를 표시한다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');

    fireEvent.click(screen.getByRole('tab', { name: '날씨' }));

    await waitFor(() => {
      expect(screen.getByText('날씨별 영향')).toBeInTheDocument();
    });
    expect(screen.getByText(/보통/)).toBeInTheDocument();
  });

  it('날씨 탭에서 비/눈/기온 영향을 표시한다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');

    fireEvent.click(screen.getByRole('tab', { name: '날씨' }));

    await waitFor(() => {
      expect(screen.getByText('비')).toBeInTheDocument();
    });
    expect(screen.getByText('눈')).toBeInTheDocument();
    expect(screen.getByText('비 영향이 평균보다 2분 적음')).toBeInTheDocument();
  });

  it('탭은 role=tablist과 aria-selected 속성을 갖는다', async () => {
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const overviewTab = screen.getByRole('tab', { name: '개요' });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    const byDayTab = screen.getByRole('tab', { name: '요일별' });
    expect(byDayTab).toHaveAttribute('aria-selected', 'false');
  });
});
