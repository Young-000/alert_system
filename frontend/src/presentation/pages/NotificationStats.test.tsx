import { render, screen } from '@testing-library/react';
import { NotificationStats } from './NotificationStats';
import type { NotificationStatsDto } from '@infrastructure/api';

describe('NotificationStats', () => {
  const baseStats: NotificationStatsDto = {
    total: 13,
    success: 10,
    fallback: 2,
    failed: 1,
    successRate: 76.9,
  };

  it('통계 데이터를 올바르게 표시한다', () => {
    render(<NotificationStats stats={baseStats} isLoading={false} />);

    expect(screen.getByTestId('notif-stats')).toBeInTheDocument();
    expect(screen.getByText('13건')).toBeInTheDocument();
    expect(screen.getByText('76.9%')).toBeInTheDocument();
    expect(screen.getByText('1건')).toBeInTheDocument();
  });

  it('로딩 중 스켈레톤을 표시한다', () => {
    render(<NotificationStats stats={null} isLoading={true} />);

    expect(screen.getByTestId('notif-stats-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('notif-stats')).not.toBeInTheDocument();
  });

  it('total이 0이면 아무것도 렌더링하지 않는다', () => {
    const emptyStats: NotificationStatsDto = {
      total: 0,
      success: 0,
      fallback: 0,
      failed: 0,
      successRate: 100,
    };

    const { container } = render(
      <NotificationStats stats={emptyStats} isLoading={false} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('stats가 null이고 로딩이 아니면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(
      <NotificationStats stats={null} isLoading={false} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('성공률 90% 초과일 때 녹색 표시', () => {
    const highStats: NotificationStatsDto = {
      total: 10,
      success: 10,
      fallback: 0,
      failed: 0,
      successRate: 100,
    };

    render(<NotificationStats stats={highStats} isLoading={false} />);

    const rateElement = screen.getByText('100%');
    expect(rateElement.className).toContain('notif-stats-rate--green');
  });

  it('성공률 70~90%일 때 노란색 표시', () => {
    render(<NotificationStats stats={baseStats} isLoading={false} />);

    const rateElement = screen.getByText('76.9%');
    expect(rateElement.className).toContain('notif-stats-rate--yellow');
  });

  it('성공률 70% 이하일 때 빨간색 표시', () => {
    const lowStats: NotificationStatsDto = {
      total: 10,
      success: 5,
      fallback: 0,
      failed: 5,
      successRate: 50,
    };

    render(<NotificationStats stats={lowStats} isLoading={false} />);

    const rateElement = screen.getByText('50%');
    expect(rateElement.className).toContain('notif-stats-rate--red');
  });

  it('실패 건수가 있으면 빨간색으로 표시', () => {
    render(<NotificationStats stats={baseStats} isLoading={false} />);

    const failedElement = screen.getByText('1건');
    expect(failedElement.className).toContain('notif-stats-rate--red');
  });

  it('실패 건수가 0이면 빨간색 미적용', () => {
    const noFailStats: NotificationStatsDto = {
      total: 10,
      success: 10,
      fallback: 0,
      failed: 0,
      successRate: 100,
    };

    render(<NotificationStats stats={noFailStats} isLoading={false} />);

    const failedElement = screen.getByText('0건');
    expect(failedElement.className).not.toContain('notif-stats-rate--red');
  });

  it('상태 바가 올바른 비율로 렌더링된다', () => {
    render(<NotificationStats stats={baseStats} isLoading={false} />);

    const bar = screen.getByLabelText(/발송 상태/);
    const segments = bar.querySelectorAll('.notif-stats-bar-segment');

    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveClass('notif-stats-bar--success');
    expect(segments[1]).toHaveClass('notif-stats-bar--fallback');
    expect(segments[2]).toHaveClass('notif-stats-bar--failed');
  });

  it('fallback이 0이면 fallback 바 세그먼트 미렌더링', () => {
    const noFallbackStats: NotificationStatsDto = {
      total: 10,
      success: 8,
      fallback: 0,
      failed: 2,
      successRate: 80,
    };

    render(<NotificationStats stats={noFallbackStats} isLoading={false} />);

    const bar = screen.getByLabelText(/발송 상태/);
    const segments = bar.querySelectorAll('.notif-stats-bar-segment');

    expect(segments).toHaveLength(2);
    expect(bar.querySelector('.notif-stats-bar--fallback')).not.toBeInTheDocument();
  });

  it('범례가 올바르게 표시된다', () => {
    render(<NotificationStats stats={baseStats} isLoading={false} />);

    expect(screen.getByText(/성공 10/)).toBeInTheDocument();
    expect(screen.getByText(/대체 2/)).toBeInTheDocument();
    expect(screen.getByText(/실패 1/)).toBeInTheDocument();
  });
});
