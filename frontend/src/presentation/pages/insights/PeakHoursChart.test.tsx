import { render, screen } from '@testing-library/react';
import { PeakHoursChart } from './PeakHoursChart';

describe('PeakHoursChart', () => {
  const defaultDistribution: Record<number, number> = {
    6: 5,
    7: 15,
    8: 45,
    9: 30,
    17: 20,
    18: 35,
    19: 10,
  };

  it('차트 영역을 렌더링한다', () => {
    render(
      <PeakHoursChart
        distribution={defaultDistribution}
        peakHour={8}
        totalSessions={160}
      />,
    );
    expect(screen.getByLabelText('시간대별 출퇴근 분포')).toBeInTheDocument();
  });

  it('총 세션 수를 표시한다', () => {
    render(
      <PeakHoursChart
        distribution={defaultDistribution}
        peakHour={8}
        totalSessions={160}
      />,
    );
    expect(screen.getByText('총 160회 기록')).toBeInTheDocument();
  });

  it('피크 시간을 레전드에 표시한다', () => {
    render(
      <PeakHoursChart
        distribution={defaultDistribution}
        peakHour={8}
        totalSessions={160}
      />,
    );
    expect(screen.getByText(/피크 시간: 8시/)).toBeInTheDocument();
  });

  it('24개의 바를 렌더링한다', () => {
    const { container } = render(
      <PeakHoursChart
        distribution={defaultDistribution}
        peakHour={8}
        totalSessions={160}
      />,
    );
    const bars = container.querySelectorAll('.insight-peak-bar');
    expect(bars.length).toBe(24);
  });

  it('피크 시간 바에 --peak 클래스를 적용한다', () => {
    const { container } = render(
      <PeakHoursChart
        distribution={defaultDistribution}
        peakHour={8}
        totalSessions={160}
      />,
    );
    const peakBars = container.querySelectorAll('.insight-peak-bar--peak');
    expect(peakBars.length).toBe(1);
  });

  it('빈 분포에서도 렌더링한다', () => {
    render(
      <PeakHoursChart
        distribution={{}}
        peakHour={0}
        totalSessions={0}
      />,
    );
    expect(screen.getByText('총 0회 기록')).toBeInTheDocument();
  });
});
