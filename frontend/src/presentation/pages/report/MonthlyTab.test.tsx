import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonthlyTab } from './MonthlyTab';

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'test-user', isLoggedIn: true }),
}));

const mockQuery = {
  data: null as unknown,
  isLoading: false,
  error: null as unknown,
  refetch: vi.fn(),
};

vi.mock('@infrastructure/query/use-report-query', () => ({
  useCommuteMonthlyStatsQuery: () => mockQuery,
}));

/**
 * 서버는 날씨 비교의 기준을 **맑은 날**로 잡고 그 차이를 `comparedToNormal`로 내려준다
 * (`get-commute-stats.use-case.ts:295-317`).
 *
 * 아래 표본은 "드문 악천후가 기준을 끌어올리는" 형태다 —
 * 맑음 40분(50회) · 비 45분(2회) · 눈 70분(1회).
 * 조건별 평균을 표본 수 없이 평균내면 기준이 51.7분이 되어 **비가 기준보다 빨라진다.**
 */
const stats = {
  userId: 'test-user',
  totalSessions: 53,
  recentSessions: 53,
  overallAverageDuration: 41,
  overallAverageWaitTime: 5,
  overallAverageDelay: 3,
  waitTimePercentage: 12,
  routeStats: [],
  dayOfWeekStats: [],
  weatherImpact: [
    { condition: '맑음', averageDuration: 40, averageDelay: 2, sampleCount: 50, comparedToNormal: 0 },
    { condition: '비', averageDuration: 45, averageDelay: 6, sampleCount: 2, comparedToNormal: 5 },
    { condition: '눈', averageDuration: 70, averageDelay: 20, sampleCount: 1, comparedToNormal: 30 },
  ],
  insights: ['비 오는 날 평균 5분 더 걸려요'],
};

function weatherCard(condition: string): HTMLElement {
  const label = screen.getByText(condition);
  const card = label.closest('.report-weather-card');
  if (!card) throw new Error(`${condition} 카드를 찾지 못했다`);
  return card as HTMLElement;
}

describe('MonthlyTab 날씨별 영향', () => {
  beforeEach(() => {
    mockQuery.data = stats;
    mockQuery.isLoading = false;
    mockQuery.error = null;
  });

  it('서버가 더 걸린다고 한 날씨를 더 빠르다고 표시하지 않는다', () => {
    render(<MonthlyTab />);

    const rain = weatherCard('비');
    expect(rain.querySelector('.report-weather-diff')).toHaveTextContent('+5분');
    expect(rain.querySelector('.report-weather-diff--better')).toBeNull();
  });

  it('같은 화면의 인사이트 문장과 날씨 카드가 같은 방향을 말한다', () => {
    render(<MonthlyTab />);

    expect(screen.getByText('비 오는 날 평균 5분 더 걸려요')).toBeInTheDocument();
    expect(weatherCard('비').querySelector('.report-weather-diff--worse')).not.toBeNull();
  });

  it('기준이 되는 맑은 날은 차이를 표시하지 않는다', () => {
    render(<MonthlyTab />);

    expect(weatherCard('맑음').querySelector('.report-weather-diff')).toHaveTextContent('-');
  });

  it('가장 느린 날씨는 더 느리다고 표시한다', () => {
    render(<MonthlyTab />);

    const snow = weatherCard('눈');
    expect(snow.querySelector('.report-weather-diff')).toHaveTextContent('+30분');
    expect(snow.querySelector('.report-weather-diff--worse')).not.toBeNull();
  });

  it('날씨 데이터가 없으면 안내 문구를 보여준다', () => {
    mockQuery.data = { ...stats, weatherImpact: [] };
    render(<MonthlyTab />);

    expect(screen.getByText('날씨별 데이터가 없어요')).toBeInTheDocument();
  });
});
