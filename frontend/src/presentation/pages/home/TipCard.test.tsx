import { render, screen, fireEvent } from '@testing-library/react';
import { TipCard } from './TipCard';
import type { CommunityTip } from '@infrastructure/api/commute-api.client';

const baseTip: CommunityTip = {
  id: 'tip-1',
  content: '4번 출구가 에스컬레이터 있어서 빨라요',
  helpfulCount: 3,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  isHelpfulByMe: false,
  isReportedByMe: false,
};

describe('TipCard', () => {
  const onHelpful = vi.fn();
  const onReport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays tip content', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);
    expect(screen.getByText(baseTip.content)).toBeInTheDocument();
  });

  it('displays relative time', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);
    expect(screen.getByText('2시간 전')).toBeInTheDocument();
  });

  it('displays helpful count', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);
    // helpful count = 3
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('calls onHelpful when helpful button clicked', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);
    const helpfulBtn = screen.getByLabelText('도움이 됐어요');
    fireEvent.click(helpfulBtn);
    expect(onHelpful).toHaveBeenCalledWith('tip-1');
  });

  it('shows active state when tip is helpful by me', () => {
    const tip = { ...baseTip, isHelpfulByMe: true };
    render(<TipCard tip={tip} onHelpful={onHelpful} onReport={onReport} />);
    const helpfulBtn = screen.getByLabelText('도움이 됐어요 취소');
    expect(helpfulBtn.className).toContain('tip-action-btn--active');
    expect(helpfulBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows report confirm when report button clicked', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);
    const reportBtn = screen.getByLabelText('이 팁 신고하기');
    fireEvent.click(reportBtn);

    expect(screen.getByText('확인')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('calls onReport when report confirmed', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);

    // Click report
    fireEvent.click(screen.getByLabelText('이 팁 신고하기'));
    // Confirm
    fireEvent.click(screen.getByText('확인'));

    expect(onReport).toHaveBeenCalledWith('tip-1');
  });

  it('cancels report when cancel clicked', () => {
    render(<TipCard tip={baseTip} onHelpful={onHelpful} onReport={onReport} />);

    fireEvent.click(screen.getByLabelText('이 팁 신고하기'));
    fireEvent.click(screen.getByText('취소'));

    // Should be back to normal report button
    expect(screen.getByLabelText('이 팁 신고하기')).toBeInTheDocument();
    expect(onReport).not.toHaveBeenCalled();
  });

  it('shows reported state when already reported', () => {
    const tip = { ...baseTip, isReportedByMe: true };
    render(<TipCard tip={tip} onHelpful={onHelpful} onReport={onReport} />);
    const reportBtn = screen.getByLabelText('이미 신고한 팁');
    expect(reportBtn).toBeDisabled();
    expect(reportBtn.className).toContain('tip-action-btn--reported');
  });

  it('does not open confirm when already reported', () => {
    const tip = { ...baseTip, isReportedByMe: true };
    render(<TipCard tip={tip} onHelpful={onHelpful} onReport={onReport} />);
    const reportBtn = screen.getByLabelText('이미 신고한 팁');
    fireEvent.click(reportBtn);
    expect(screen.queryByText('확인')).not.toBeInTheDocument();
  });

  it('displays "방금 전" for very recent tips', () => {
    const recentTip = {
      ...baseTip,
      createdAt: new Date(Date.now() - 10_000).toISOString(), // 10 seconds ago
    };
    render(<TipCard tip={recentTip} onHelpful={onHelpful} onReport={onReport} />);
    expect(screen.getByText('방금 전')).toBeInTheDocument();
  });

  it('displays minutes for tips within the hour', () => {
    const tip = {
      ...baseTip,
      createdAt: new Date(Date.now() - 15 * 60_000).toISOString(), // 15 min ago
    };
    render(<TipCard tip={tip} onHelpful={onHelpful} onReport={onReport} />);
    expect(screen.getByText('15분 전')).toBeInTheDocument();
  });
});
