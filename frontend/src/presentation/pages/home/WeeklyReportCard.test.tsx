import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeeklyReportCard } from './WeeklyReportCard';
import type { WeeklyReportResponse, DailyStatsResponse } from '@infrastructure/api/commute-api.client';

function makeDailyStat(overrides: Partial<DailyStatsResponse> = {}): DailyStatsResponse {
  return {
    date: '2026-02-17',
    dayOfWeek: 1,
    dayName: '월요일',
    sessionCount: 2,
    averageDuration: 50,
    totalDuration: 100,
    averageDelay: 3,
    averageWaitTime: 5,
    weatherCondition: '맑음',
    ...overrides,
  };
}

function makeReport(overrides: Partial<WeeklyReportResponse> = {}): WeeklyReportResponse {
  const bestDay = makeDailyStat({
    date: '2026-02-18',
    dayOfWeek: 2,
    dayName: '화요일',
    averageDuration: 43,
  });
  const worstDay = makeDailyStat({
    date: '2026-02-20',
    dayOfWeek: 4,
    dayName: '목요일',
    averageDuration: 62,
  });

  return {
    weekStartDate: '2026-02-17',
    weekEndDate: '2026-02-23',
    weekLabel: '2월 4주차',
    totalSessions: 8,
    totalRecordedDays: 5,
    averageDuration: 47,
    minDuration: 38,
    maxDuration: 62,
    dailyStats: [
      makeDailyStat({ date: '2026-02-17', dayName: '월요일', averageDuration: 52 }),
      makeDailyStat({ date: '2026-02-18', dayName: '화요일', averageDuration: 43 }),
      makeDailyStat({ date: '2026-02-19', dayName: '수요일', averageDuration: 48 }),
      makeDailyStat({ date: '2026-02-20', dayName: '목요일', averageDuration: 62 }),
      makeDailyStat({ date: '2026-02-21', dayName: '금요일', averageDuration: 42 }),
    ],
    bestDay,
    worstDay,
    previousWeekAverage: 50,
    changeFromPrevious: -3,
    changePercentage: -6,
    trend: 'improving',
    insights: [
      '전주보다 평균 3분 빨라졌어요!',
      '화요일이 가장 빨랐어요 (43분)',
    ],
    streakWeeklyCount: 5,
    streakWeeklyGoal: 5,
    ...overrides,
  };
}

describe('WeeklyReportCard', () => {
  const defaultProps = {
    report: makeReport(),
    isLoading: false,
    error: '',
    weekOffset: 0,
    onWeekChange: vi.fn(),
  };

  it('로딩 중일 때 스켈레톤을 표시한다', () => {
    render(
      <WeeklyReportCard {...defaultProps} isLoading={true} report={null} />,
    );
    expect(screen.getByLabelText('주간 리포트 로딩 중')).toBeInTheDocument();
  });

  it('에러 시 에러 메시지를 표시한다', () => {
    render(
      <WeeklyReportCard
        {...defaultProps}
        error="주간 리포트를 불러올 수 없습니다"
        report={null}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('주간 리포트를 불러올 수 없습니다');
  });

  it('데이터가 없으면 빈 상태 메시지를 표시한다', () => {
    render(
      <WeeklyReportCard {...defaultProps} report={null} />,
    );
    expect(screen.getByText(/이번 주 기록이 아직 없어요/)).toBeInTheDocument();
  });

  it('totalSessions가 0이고 weekOffset=0이면 빈 상태를 표시한다', () => {
    render(
      <WeeklyReportCard
        {...defaultProps}
        report={makeReport({ totalSessions: 0 })}
      />,
    );
    expect(screen.getByText(/이번 주 기록이 아직 없어요/)).toBeInTheDocument();
  });

  it('주간 평균 소요시간을 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByText('47분')).toBeInTheDocument();
  });

  it('주차 라벨을 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByText('2월 4주차')).toBeInTheDocument();
  });

  it('스트릭 진행률을 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByText(/기록 5일 \/ 목표 5일/)).toBeInTheDocument();
  });

  it('스트릭 목표 달성 시 체크마크를 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByLabelText('목표 달성')).toBeInTheDocument();
  });

  it('스트릭 목표 미달성 시 체크마크가 없다', () => {
    render(
      <WeeklyReportCard
        {...defaultProps}
        report={makeReport({ streakWeeklyCount: 3 })}
      />,
    );
    expect(screen.queryByLabelText('목표 달성')).not.toBeInTheDocument();
  });

  it('트렌드 인디케이터를 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByText(/전주 대비 3분 단축/)).toBeInTheDocument();
  });

  it('접기/펼치기가 토글된다', () => {
    render(<WeeklyReportCard {...defaultProps} />);

    const toggle = screen.getByRole('button', { name: /펼치기/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /접기/ })).toHaveAttribute('aria-expanded', 'true');

    // 인사이트가 보여야 함
    expect(screen.getByText('전주보다 평균 3분 빨라졌어요!')).toBeInTheDocument();
  });

  it('펼침 시 일별 차트를 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /펼치기/ }));

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('일별 소요시간')).toBeInTheDocument();
  });

  it('펼침 시 베스트/워스트 하이라이트를 표시한다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /펼치기/ }));

    expect(screen.getByText(/최고: 화요일 43분/)).toBeInTheDocument();
    expect(screen.getByText(/최저: 목요일 62분/)).toBeInTheDocument();
  });

  it('이전 주 버튼 클릭 시 onWeekChange를 호출한다', () => {
    const onWeekChange = vi.fn();
    render(
      <WeeklyReportCard {...defaultProps} weekOffset={0} onWeekChange={onWeekChange} />,
    );

    fireEvent.click(screen.getByLabelText('이전 주'));
    expect(onWeekChange).toHaveBeenCalledWith(1);
  });

  it('다음 주 버튼 클릭 시 onWeekChange를 호출한다', () => {
    const onWeekChange = vi.fn();
    render(
      <WeeklyReportCard {...defaultProps} weekOffset={2} onWeekChange={onWeekChange} />,
    );

    fireEvent.click(screen.getByLabelText('다음 주'));
    expect(onWeekChange).toHaveBeenCalledWith(1);
  });

  it('weekOffset=0이면 다음 주 버튼이 비활성화된다', () => {
    render(<WeeklyReportCard {...defaultProps} weekOffset={0} />);
    expect(screen.getByLabelText('다음 주')).toBeDisabled();
  });

  it('weekOffset=4이면 이전 주 버튼이 비활성화된다', () => {
    render(<WeeklyReportCard {...defaultProps} weekOffset={4} />);
    expect(screen.getByLabelText('이전 주')).toBeDisabled();
  });

  it('전주 데이터 없고 세션 있으면 첫 리포트 메시지를 표시한다', () => {
    render(
      <WeeklyReportCard
        {...defaultProps}
        report={makeReport({ trend: null, previousWeekAverage: null, changeFromPrevious: null })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /펼치기/ }));
    expect(screen.getByText('이번 주가 첫 리포트예요!')).toBeInTheDocument();
  });

  it('기록일 3일 미만이면 데이터 부족 안내를 표시한다', () => {
    render(
      <WeeklyReportCard
        {...defaultProps}
        report={makeReport({ totalRecordedDays: 2 })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /펼치기/ }));
    expect(screen.getByText(/데이터가 부족해 정확도가 낮을 수 있어요/)).toBeInTheDocument();
  });

  it('카드에 주간 리포트 aria-label이 있다', () => {
    render(<WeeklyReportCard {...defaultProps} />);
    expect(screen.getByLabelText('2월 4주차 주간 리포트')).toBeInTheDocument();
  });
});
