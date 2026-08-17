import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeeklyTab } from './WeeklyTab';

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'test-user', isLoggedIn: true }),
}));

const mockQuery = {
  data: null as unknown,
  isLoading: false,
  error: null as unknown,
  refetch: vi.fn(),
};

// 훅만 갈아끼운다. 상한(`weekly-report-bounds`)은 mock하지 않으므로 이 테스트는
// 테스트가 정한 숫자가 아니라 화면이 실제로 쓰는 상한을 검증한다.
vi.mock('@infrastructure/query/use-weekly-report-query', () => ({
  useWeeklyReportQuery: () => mockQuery,
}));

const report = {
  weekStartDate: '2026-02-17',
  weekEndDate: '2026-02-23',
  weekLabel: '2월 4주차',
  totalSessions: 8,
  totalRecordedDays: 5,
  averageDuration: 47,
  minDuration: 38,
  maxDuration: 62,
  dailyStats: [],
  bestDay: null,
  worstDay: null,
  previousWeekAverage: 50,
  changeFromPrevious: -3,
  changePercentage: -6,
  trend: 'improving',
  insights: [],
  streakWeeklyCount: 5,
  streakWeeklyGoal: 5,
};

describe('WeeklyTab 주 이동 범위', () => {
  beforeEach(() => {
    mockQuery.data = report;
    mockQuery.isLoading = false;
    mockQuery.error = null;
  });

  it('서버가 거부하는 주차까지 이동시키지 않는다', () => {
    render(<WeeklyTab />);

    // 서버는 weekOffset 0~4만 허용한다. 4까지 내려가면 더 갈 곳이 없어야 한다.
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByLabelText('이전 주'));
    }

    expect(screen.getByLabelText('이전 주')).toBeDisabled();
  });

  it('허용 범위 안에서는 계속 이동할 수 있다', () => {
    render(<WeeklyTab />);

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByLabelText('이전 주'));
    }

    expect(screen.getByLabelText('이전 주')).not.toBeDisabled();
  });

  it('이번 주에서는 다음 주로 갈 수 없다', () => {
    render(<WeeklyTab />);

    expect(screen.getByLabelText('다음 주')).toBeDisabled();
  });
});
