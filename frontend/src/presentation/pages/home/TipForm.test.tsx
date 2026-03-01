import { render, screen, fireEvent } from '@testing-library/react';
import { TipForm } from './TipForm';

describe('TipForm', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea with placeholder', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/)).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('updates character count on input', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '테스트' } });
    const charCounter = screen.getByLabelText('팁 작성').parentElement?.querySelector('.tip-form-char-count');
    expect(charCounter?.textContent).toBe('3/100');
  });

  it('submit button is disabled when empty', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const submitBtn = screen.getByRole('button', { name: '등록' });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled when text entered', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '좋은 팁' } });
    const submitBtn = screen.getByRole('button', { name: '등록' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with trimmed content on click', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '  팁 내용  ' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    expect(onSubmit).toHaveBeenCalledWith('station:1', '팁 내용');
  });

  it('clears input after submission', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '팁 내용' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    expect(textarea.value).toBe('');
  });

  it('shows rate limit message when rate limited', () => {
    render(
      <TipForm checkpointKey="station:1" onSubmit={onSubmit} isRateLimited />,
    );
    expect(screen.getByText(/오늘은 팁을 3개까지 남길 수 있어요/)).toBeInTheDocument();
  });

  it('disables submit when rate limited', () => {
    render(
      <TipForm checkpointKey="station:1" onSubmit={onSubmit} isRateLimited />,
    );
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '팁 내용' } });
    expect(screen.getByRole('button', { name: '등록' })).toBeDisabled();
  });

  it('shows disabled message when not eligible', () => {
    render(
      <TipForm checkpointKey="station:1" onSubmit={onSubmit} isEligible={false} />,
    );
    expect(screen.getByText(/3회 이상 출퇴근 기록 후 팁을 남길 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/이 구간 팁을 남겨보세요/)).not.toBeInTheDocument();
  });

  it('shows "등록 중..." when submitting', () => {
    render(
      <TipForm checkpointKey="station:1" onSubmit={onSubmit} isSubmitting />,
    );
    expect(screen.getByRole('button', { name: '등록 중...' })).toBeDisabled();
  });

  it('submits on Enter key (without Shift)', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '팁 내용' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith('station:1', '팁 내용');
  });

  it('does not submit on Shift+Enter', () => {
    render(<TipForm checkpointKey="station:1" onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/이 구간 팁을 남겨보세요/);
    fireEvent.change(textarea, { target: { value: '팁 내용' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
