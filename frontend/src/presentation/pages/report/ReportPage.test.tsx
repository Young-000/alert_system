import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportPage } from './ReportPage';

// Mock useAuth
const mockAuth = { userId: '', userName: '', userEmail: '', phoneNumber: '', isLoggedIn: false };
vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

// Mock query hooks
const mockWeeklyReport = {
  data: null as unknown,
  isLoading: false,
  error: null as unknown,
};
vi.mock('@infrastructure/query/use-weekly-report-query', () => ({
  useWeeklyReportQuery: () => mockWeeklyReport,
}));

const mockMonthlyStats = {
  data: null as unknown,
  isLoading: false,
  error: null as unknown,
};
vi.mock('@infrastructure/query/use-report-query', () => ({
  useCommuteMonthlyStatsQuery: () => mockMonthlyStats,
  useAnalyticsSummaryQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPage(): void {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/reports']}>
        <ReportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportPage', () => {
  beforeEach(() => {
    mockAuth.userId = '';
    mockAuth.isLoggedIn = false;
    mockWeeklyReport.data = null;
    mockWeeklyReport.isLoading = false;
    mockWeeklyReport.error = null;
    mockMonthlyStats.data = null;
    mockMonthlyStats.isLoading = false;
    mockMonthlyStats.error = null;
  });

  it('비로그인 시 로그인 유도 메시지를 표시한다', () => {
    renderPage();
    expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
    expect(screen.getByText('로그인하기')).toBeInTheDocument();
  });

  it('로그인 시 탭 바를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    expect(screen.getByRole('tab', { name: '이번 주' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '월간' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '요약' })).toBeInTheDocument();
  });

  it('기본 탭은 "이번 주"이다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    const weeklyTab = screen.getByRole('tab', { name: '이번 주' });
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('탭 전환 시 월간 탭이 활성화된다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    const monthlyTab = screen.getByRole('tab', { name: '월간' });
    fireEvent.click(monthlyTab);
    expect(monthlyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('탭 전환 시 요약 탭이 활성화된다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    const summaryTab = screen.getByRole('tab', { name: '요약' });
    fireEvent.click(summaryTab);
    expect(summaryTab).toHaveAttribute('aria-selected', 'true');
  });

  it('로딩 중일 때 스켈레톤을 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    mockWeeklyReport.isLoading = true;
    renderPage();

    expect(screen.getByLabelText('주간 리포트 로딩 중')).toBeInTheDocument();
  });

  it('에러 시 에러 메시지를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    mockWeeklyReport.error = new Error('Network error');
    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('데이터가 없으면 빈 상태를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    expect(screen.getByText('이번 주 기록이 아직 없어요')).toBeInTheDocument();
  });

  it('페이지 제목이 "리포트"이다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    expect(screen.getByText('리포트')).toBeInTheDocument();
  });

  it('월간 탭 빈 상태를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: '월간' }));
    expect(screen.getByText('최근 30일 기록이 없어요')).toBeInTheDocument();
  });

  it('요약 탭 빈 상태를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: '요약' }));
    expect(screen.getByText('분석 데이터가 아직 없어요')).toBeInTheDocument();
  });

  it('주간 데이터가 있을 때 요약 정보를 표시한다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    mockWeeklyReport.data = {
      weekStartDate: '2026-02-17',
      weekEndDate: '2026-02-23',
      weekLabel: '2월 4주차',
      totalSessions: 8,
      totalRecordedDays: 5,
      averageDuration: 47,
      minDuration: 38,
      maxDuration: 62,
      dailyStats: [
        {
          date: '2026-02-17',
          dayOfWeek: 1,
          dayName: '월요일',
          sessionCount: 2,
          averageDuration: 52,
          totalDuration: 104,
          averageDelay: 3,
          averageWaitTime: 5,
          weatherCondition: '맑음',
        },
      ],
      bestDay: {
        date: '2026-02-18',
        dayOfWeek: 2,
        dayName: '화요일',
        sessionCount: 1,
        averageDuration: 43,
        totalDuration: 43,
        averageDelay: 1,
        averageWaitTime: 3,
        weatherCondition: '맑음',
      },
      worstDay: null,
      previousWeekAverage: 50,
      changeFromPrevious: -3,
      changePercentage: -6,
      trend: 'improving',
      insights: ['전주보다 평균 3분 빨라졌어요!'],
      streakWeeklyCount: 5,
      streakWeeklyGoal: 5,
    };
    renderPage();

    expect(screen.getByText('47분')).toBeInTheDocument();
    expect(screen.getByText('8회')).toBeInTheDocument();
    expect(screen.getByText('5일')).toBeInTheDocument();
    expect(screen.getByText('2월 4주차')).toBeInTheDocument();
  });

  it('탭 패널에 올바른 role 속성이 있다', () => {
    mockAuth.userId = 'test-user';
    mockAuth.isLoggedIn = true;
    renderPage();

    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
