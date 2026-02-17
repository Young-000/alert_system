import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DailyBarChart } from './DailyBarChart';
import type { DailyStatsResponse } from '@infrastructure/api/commute-api.client';

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

function makeWeekStats(): DailyStatsResponse[] {
  return [
    makeDailyStat({ date: '2026-02-17', dayOfWeek: 1, dayName: '월요일', averageDuration: 52 }),
    makeDailyStat({ date: '2026-02-18', dayOfWeek: 2, dayName: '화요일', averageDuration: 43 }),
    makeDailyStat({ date: '2026-02-19', dayOfWeek: 3, dayName: '수요일', averageDuration: 48 }),
    makeDailyStat({ date: '2026-02-20', dayOfWeek: 4, dayName: '목요일', averageDuration: 62 }),
    makeDailyStat({ date: '2026-02-21', dayOfWeek: 5, dayName: '금요일', averageDuration: 42 }),
  ];
}

describe('DailyBarChart', () => {
  it('일별 막대를 모두 렌더링한다', () => {
    const stats = makeWeekStats();
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate="2026-02-21"
        worstDayDate="2026-02-20"
        maxDuration={62}
      />,
    );

    expect(screen.getByText('월')).toBeInTheDocument();
    expect(screen.getByText('화')).toBeInTheDocument();
    expect(screen.getByText('수')).toBeInTheDocument();
    expect(screen.getByText('목')).toBeInTheDocument();
    expect(screen.getByText('금')).toBeInTheDocument();
  });

  it('소요시간을 분 단위로 표시한다', () => {
    const stats = makeWeekStats();
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate={null}
        worstDayDate={null}
        maxDuration={62}
      />,
    );

    expect(screen.getByText(/52분/)).toBeInTheDocument();
    expect(screen.getByText(/43분/)).toBeInTheDocument();
    expect(screen.getByText(/62분/)).toBeInTheDocument();
  });

  it('베스트 날에 별 아이콘을 표시한다', () => {
    const stats = makeWeekStats();
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate="2026-02-21"
        worstDayDate="2026-02-20"
        maxDuration={62}
      />,
    );

    // 금요일 행의 aria-label 확인
    const bestBar = screen.getByLabelText('금요일 42분');
    expect(bestBar).toBeInTheDocument();
  });

  it('워스트 날에 마커를 표시한다', () => {
    const stats = makeWeekStats();
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate="2026-02-21"
        worstDayDate="2026-02-20"
        maxDuration={62}
      />,
    );

    const worstBar = screen.getByLabelText('목요일 62분');
    expect(worstBar).toBeInTheDocument();
  });

  it('기록 없는 날에 "기록 없음"을 표시한다', () => {
    const stats = [
      makeDailyStat({ date: '2026-02-17', dayName: '월요일', sessionCount: 0, averageDuration: 0 }),
    ];
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate={null}
        worstDayDate={null}
        maxDuration={50}
      />,
    );

    expect(screen.getByText('기록 없음')).toBeInTheDocument();
    expect(screen.getByLabelText('월요일 기록 없음')).toBeInTheDocument();
  });

  it('빈 데이터일 때 차트 컨테이너에 적절한 aria-label을 가진다', () => {
    render(
      <DailyBarChart
        dailyStats={[]}
        bestDayDate={null}
        worstDayDate={null}
        maxDuration={0}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      '일별 소요시간: 데이터 없음',
    );
  });

  it('데이터가 있을 때 차트 aria-label에 요약 정보가 포함된다', () => {
    const stats = [
      makeDailyStat({ date: '2026-02-17', dayName: '월요일', averageDuration: 52, sessionCount: 2 }),
      makeDailyStat({ date: '2026-02-18', dayName: '화요일', averageDuration: 43, sessionCount: 1 }),
    ];
    render(
      <DailyBarChart
        dailyStats={stats}
        bestDayDate={null}
        worstDayDate={null}
        maxDuration={52}
      />,
    );

    const chart = screen.getByRole('img');
    expect(chart.getAttribute('aria-label')).toContain('월 52분');
    expect(chart.getAttribute('aria-label')).toContain('화 43분');
  });
});
