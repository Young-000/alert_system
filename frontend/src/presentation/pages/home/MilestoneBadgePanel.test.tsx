import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilestoneBadgePanel } from './MilestoneBadgePanel';

describe('MilestoneBadgePanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    milestonesAchieved: ['7d' as const, '14d' as const],
    currentStreak: 20,
    nextMilestone: { type: '30d' as const, label: '30일 연속', daysRemaining: 10, progress: 20 / 30 },
  };

  it('isOpen이 false이면 렌더링하지 않는다', () => {
    render(<MilestoneBadgePanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('배지 컬렉션 제목을 표시한다', () => {
    render(<MilestoneBadgePanel {...defaultProps} />);
    expect(screen.getByText('배지 컬렉션')).toBeInTheDocument();
  });

  it('현재 스트릭 일수를 표시한다', () => {
    render(<MilestoneBadgePanel {...defaultProps} />);
    expect(screen.getByText(/연속 20일째/)).toBeInTheDocument();
  });

  it('5개의 마일스톤을 모두 표시한다', () => {
    render(<MilestoneBadgePanel {...defaultProps} />);
    expect(screen.getByText('첫걸음')).toBeInTheDocument();
    expect(screen.getByText('습관 형성')).toBeInTheDocument();
    expect(screen.getByText('한 달 챔피언')).toBeInTheDocument();
    expect(screen.getByText('철인')).toBeInTheDocument();
    expect(screen.getByText('전설')).toBeInTheDocument();
  });

  it('획득한 배지에 체크마크를 표시한다', () => {
    render(<MilestoneBadgePanel {...defaultProps} />);
    const checks = screen.getAllByLabelText('획득 완료');
    expect(checks).toHaveLength(2);
  });

  it('다음 마일스톤에 진행률을 표시한다', () => {
    render(<MilestoneBadgePanel {...defaultProps} />);
    expect(screen.getByText('10일 남음')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '67');
  });

  it('닫기 버튼 클릭 시 onClose를 호출한다', () => {
    const onClose = vi.fn();
    render(<MilestoneBadgePanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('닫기'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('오버레이 클릭 시 onClose를 호출한다', () => {
    const onClose = vi.fn();
    render(<MilestoneBadgePanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('모든 마일스톤을 달성했을 때 진행률 바를 표시하지 않는다', () => {
    render(
      <MilestoneBadgePanel
        {...defaultProps}
        milestonesAchieved={['7d', '14d', '30d', '60d', '100d']}
        nextMilestone={null}
      />,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/남음/)).not.toBeInTheDocument();
  });
});
