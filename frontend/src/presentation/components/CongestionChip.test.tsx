import { render, screen } from '@testing-library/react';
import { CongestionChip } from './CongestionChip';

describe('CongestionChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "원활" label for low level', () => {
    render(<CongestionChip level="low" />);
    const chip = screen.getByTestId('congestion-chip');
    expect(chip).toHaveClass('congestion-chip--low');
    expect(screen.getByText('원활')).toBeInTheDocument();
  });

  it('renders "보통" label for moderate level', () => {
    render(<CongestionChip level="moderate" />);
    expect(screen.getByText('보통')).toBeInTheDocument();
    expect(screen.getByTestId('congestion-chip')).toHaveClass('congestion-chip--moderate');
  });

  it('renders "혼잡" label for high level', () => {
    render(<CongestionChip level="high" />);
    expect(screen.getByText('혼잡')).toBeInTheDocument();
    expect(screen.getByTestId('congestion-chip')).toHaveClass('congestion-chip--high');
  });

  it('renders "매우혼잡" label for severe level', () => {
    render(<CongestionChip level="severe" />);
    expect(screen.getByText('매우혼잡')).toBeInTheDocument();
    expect(screen.getByTestId('congestion-chip')).toHaveClass('congestion-chip--severe');
  });

  it('shows "수집 중" when sampleCount < 3', () => {
    render(<CongestionChip level="high" sampleCount={2} />);
    expect(screen.getByText('수집 중')).toBeInTheDocument();
    expect(screen.getByTestId('congestion-chip')).toHaveClass('congestion-chip--collecting');
    expect(screen.queryByText('혼잡')).not.toBeInTheDocument();
  });

  it('shows normal label when sampleCount >= 3', () => {
    render(<CongestionChip level="high" sampleCount={3} />);
    expect(screen.getByText('혼잡')).toBeInTheDocument();
    expect(screen.queryByText('수집 중')).not.toBeInTheDocument();
  });

  it('shows sm size by default (no wait time detail)', () => {
    render(<CongestionChip level="low" avgWaitMinutes={5} sampleCount={10} />);
    const chip = screen.getByTestId('congestion-chip');
    expect(chip).toHaveClass('congestion-chip--sm');
    // sm variant does NOT show wait time details
    expect(screen.queryByText(/5분/)).not.toBeInTheDocument();
    expect(screen.queryByText(/10건/)).not.toBeInTheDocument();
  });

  it('shows wait time and sample count in md size', () => {
    render(
      <CongestionChip level="high" avgWaitMinutes={7.2} sampleCount={23} size="md" />,
    );
    const chip = screen.getByTestId('congestion-chip');
    expect(chip).toHaveClass('congestion-chip--md');
    expect(screen.getByText('혼잡')).toBeInTheDocument();
    expect(screen.getByText(/7분/)).toBeInTheDocument();
    expect(screen.getByText(/23건/)).toBeInTheDocument();
  });

  it('has correct aria-label for accessibility', () => {
    render(<CongestionChip level="high" avgWaitMinutes={7} />);
    const chip = screen.getByTestId('congestion-chip');
    expect(chip).toHaveAttribute('aria-label', '혼잡도 혼잡, 평균 대기 7분');
  });

  it('has collecting aria-label when data insufficient', () => {
    render(<CongestionChip level="low" sampleCount={1} />);
    const chip = screen.getByTestId('congestion-chip');
    expect(chip).toHaveAttribute('aria-label', '혼잡도 데이터 수집 중');
  });

  it('renders without avgWaitMinutes in md and omits detail', () => {
    render(<CongestionChip level="moderate" size="md" />);
    expect(screen.getByText('보통')).toBeInTheDocument();
    expect(screen.queryByText(/분/)).not.toBeInTheDocument();
  });
});
