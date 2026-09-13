import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TestProviders } from '../../../test-utils';
import { PatternAnalysisPage } from './PatternAnalysisPage';
import { behaviorApiClient } from '@infrastructure/api';
// 상대 경로 import — `vitest.config.ts:39-40`이 `@infrastructure/api/*`를 **전부**
// 목 배럴 하나로 보내기 때문에, 별칭으로 가져오면 변환 함수가 목으로 접힌다.
import { toPredictionResponse, toInsightsResponse } from '../../../infrastructure/api/behavior-response-adapter';
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
 * 픽스처는 **서버가 보내는 모양**에서 출발해 실제 변환 함수를 통과시킨다.
 * 예전 픽스처는 화면 타입을 보고 지어낸 모양이라(`summary`·`weatherSensitivity`·
 * `avgMinutes`) 서버에 그런 키가 없다는 사실을 테스트가 볼 수 없었고,
 * 그 사이 홈 카드와 이 페이지가 실제로는 `undefined` 접근으로 죽고 있었다.
 * 변환을 거치게 두면 픽스처가 서버와 다시 어긋날 수 없다.
 */
const SERVER_PREDICTION = {
  departureTime: '08:05',
  departureRange: { early: '07:55', late: '08:15' },
  confidence: 0.72,
  tier: 'day_aware' as const,
  factors: [
    { type: 'day_of_week', label: '월요일 패턴', impact: -3, description: '월요일은 평균보다 3분 일찍 출발', confidence: 0.8 },
    { type: 'weather', label: '비 영향', impact: -8, description: '비 올 때 일찍 출발', confidence: 0.65 },
  ],
  dataStatus: { totalRecords: 15, recordsUsed: 15, nextTierAt: 20, nextTierName: 'weather_aware' },
};

const SERVER_INSIGHTS = {
  dayOfWeek: {
    segments: [
      { day: 1, dayName: '월요일', avgDepartureTime: '08:05', sampleCount: 3, stdDevMinutes: 4 },
      { day: 2, dayName: '화요일', avgDepartureTime: '08:10', sampleCount: 3, stdDevMinutes: 3 },
      { day: 3, dayName: '수요일', avgDepartureTime: '08:08', sampleCount: 3, stdDevMinutes: 2 },
      { day: 4, dayName: '목요일', avgDepartureTime: '08:12', sampleCount: 3, stdDevMinutes: 5 },
      { day: 5, dayName: '금요일', avgDepartureTime: '08:20', sampleCount: 3, stdDevMinutes: 9 },
    ],
    mostConsistentDay: 3,
    mostVariableDay: 5,
  },
  weatherImpact: {
    sensitivity: 'medium' as const,
    coefficients: { rain: -8, snow: -14, temperature: -1 },
    description: '비 오는 날 평균 8분 일찍 출발',
  },
  overallStats: {
    totalRecords: 15,
    trackingSince: '2026-08-01T00:00:00.000Z',
    avgDepartureTime: '08:05',
    currentTier: 'day_aware' as const,
    predictionAccuracy: 0.72,
  },
};

const mockPrediction = toPredictionResponse(SERVER_PREDICTION);
const mockInsights = toInsightsResponse(SERVER_INSIGHTS);

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
    // 서버가 전체 편차를 주지 않으므로 "편차 분"짜리 빈 칸을 그리지 않는다.
    expect(screen.queryByText('편차')).not.toBeInTheDocument();
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
    // 서버 description("비 오는 날 평균 8분 일찍 출발")은 바로 위 '비' 줄과 같은 말이라
    // 옮기지 않는다. 전체 평균과의 비교를 서버가 주기 전까지 이 섹션은 뜨지 않는다.
    expect(screen.queryByText('전체 평균과 비교')).not.toBeInTheDocument();
  });

  it('요일 평균이 소수여도 시계에 없는 시각을 만들지 않는다', async () => {
    // 합 2399 / 5 = 479.8분. 분 자리를 따로 반올림하면 60분이 되어 "07:60"이 나온다.
    mockBehaviorApi.getInsights.mockResolvedValue(
      toInsightsResponse({
        ...SERVER_INSIGHTS,
        dayOfWeek: {
          ...SERVER_INSIGHTS.dayOfWeek,
          segments: [
            { day: 1, dayName: '월요일', avgDepartureTime: '07:58', sampleCount: 3, stdDevMinutes: 4 },
            { day: 2, dayName: '화요일', avgDepartureTime: '07:59', sampleCount: 3, stdDevMinutes: 3 },
            { day: 3, dayName: '수요일', avgDepartureTime: '08:00', sampleCount: 3, stdDevMinutes: 2 },
            { day: 4, dayName: '목요일', avgDepartureTime: '08:01', sampleCount: 3, stdDevMinutes: 5 },
            { day: 5, dayName: '금요일', avgDepartureTime: '08:01', sampleCount: 3, stdDevMinutes: 9 },
          ],
        },
      }),
    );

    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    expect(await screen.findByText('평균 08:00')).toBeInTheDocument();
  });

  it('요일 평균이 정수면 그대로 표시한다', async () => {
    // 대조군: "분을 항상 버린다"는 오답을 차단한다. 합 2400 / 5 = 480분.
    mockBehaviorApi.getInsights.mockResolvedValue({
      ...mockInsights,
      dayOfWeek: {
        ...mockInsights.dayOfWeek,
        segments: [
          { dayOfWeek: 1, dayName: '월', avgMinutes: 480, stdDevMinutes: 4, sampleCount: 3 },
          { dayOfWeek: 2, dayName: '화', avgMinutes: 480, stdDevMinutes: 3, sampleCount: 3 },
          { dayOfWeek: 3, dayName: '수', avgMinutes: 480, stdDevMinutes: 2, sampleCount: 3 },
          { dayOfWeek: 4, dayName: '목', avgMinutes: 480, stdDevMinutes: 5, sampleCount: 3 },
          { dayOfWeek: 5, dayName: '금', avgMinutes: 480, stdDevMinutes: 9, sampleCount: 3 },
        ],
      },
    });

    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    expect(await screen.findByText('평균 08:00')).toBeInTheDocument();
  });

  it('요일별 막대는 각 요일의 출발 시각을 그대로 보여준다', async () => {
    // 대조군: 평균 계산을 고치면서 개별 요일 표기를 바꾸지 않았다는 증거. 485분 = 08:05.
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    await screen.findByText('요일별 출발 시간');
    expect(screen.getByLabelText(/월요일: 08:05/)).toBeInTheDocument();
  });

  it('요일별 데이터가 없으면 다음 행동을 정확히 하나 제공한다', async () => {
    // dead-end 금지 (ux-baseline 원칙 3 · 체크리스트 6-2).
    mockBehaviorApi.getInsights.mockResolvedValue({
      ...mockInsights,
      dayOfWeek: { segments: [], mostConsistentDay: null, mostVariableDay: null },
    });

    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getAllByRole('button')).toHaveLength(1);
    expect(within(panel).getByRole('button', { name: '출퇴근 기록하기' })).toBeInTheDocument();
  });

  it('날씨 데이터가 없으면 다음 행동을 정확히 하나 제공한다', async () => {
    mockBehaviorApi.getInsights.mockResolvedValue({
      ...mockInsights,
      weatherSensitivity: null,
    });

    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '날씨' }));

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getAllByRole('button')).toHaveLength(1);
    expect(within(panel).getByRole('button', { name: '출퇴근 기록하기' })).toBeInTheDocument();
  });

  it('데이터가 있는 탭에는 안내 버튼을 넣지 않는다', async () => {
    // 대조군: "모든 탭에 버튼을 단다"는 오답을 차단한다.
    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    await screen.findByText('출발 패턴 요약');
    fireEvent.click(screen.getByRole('tab', { name: '요일별' }));

    await screen.findByText('요일별 출발 시간');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).queryByRole('button', { name: '출퇴근 기록하기' })).not.toBeInTheDocument();
  });

  it('비로그인 상태에서 로그인 CTA를 제공한다', () => {
    // dead-end 금지: 모든 상태의 끝에 다음 행동이 정확히 하나 있어야 한다.
    localStorage.clear();

    render(
      <TestProviders>
        <PatternAnalysisPage />
      </TestProviders>,
    );

    expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
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
