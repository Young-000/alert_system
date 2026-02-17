import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilestoneModal } from './MilestoneModal';

describe('MilestoneModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    milestone: { type: '7d', label: '7일 연속' },
    currentStreak: 7,
    nextMilestone: { label: '30일 연속', daysRemaining: 23 },
  };

  it('isOpen이 false이면 렌더링하지 않는다', () => {
    render(<MilestoneModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('마일스톤 달성 메시지를 표시한다', () => {
    render(<MilestoneModal {...defaultProps} />);
    expect(screen.getByText('7일 연속 달성!')).toBeInTheDocument();
    expect(screen.getByText(/연속 7일째/)).toBeInTheDocument();
  });

  it('다음 마일스톤 정보를 표시한다', () => {
    render(<MilestoneModal {...defaultProps} />);
    expect(screen.getByText(/30일 연속/)).toBeInTheDocument();
    expect(screen.getByText(/23일 남음/)).toBeInTheDocument();
  });

  it('다음 마일스톤이 없으면 해당 영역을 표시하지 않는다', () => {
    render(<MilestoneModal {...defaultProps} nextMilestone={null} />);
    expect(screen.queryByText(/남음/)).not.toBeInTheDocument();
  });

  it('확인 버튼 클릭 시 onClose를 호출한다', () => {
    const onClose = vi.fn();
    render(<MilestoneModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('확인'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('오버레이 클릭 시 onClose를 호출한다', () => {
    const onClose = vi.fn();
    render(<MilestoneModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('마일스톤 타입에 따른 아이콘을 표시한다', () => {
    const { rerender } = render(<MilestoneModal {...defaultProps} />);
    expect(screen.getByText('🥉')).toBeInTheDocument();

    rerender(<MilestoneModal {...defaultProps} milestone={{ type: '30d', label: '30일 연속' }} />);
    expect(screen.getByText('🥈')).toBeInTheDocument();

    rerender(<MilestoneModal {...defaultProps} milestone={{ type: '100d', label: '100일 연속' }} />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
  });
});
