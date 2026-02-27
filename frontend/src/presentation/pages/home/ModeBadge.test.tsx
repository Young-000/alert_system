import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeBadge } from './ModeBadge';
import type { CommuteMode } from './use-commute-mode';

describe('ModeBadge', () => {
  it('출근 모드를 올바르게 표시한다', () => {
    render(<ModeBadge mode="commute" onToggle={vi.fn()} />);
    expect(screen.getByText('출근 모드')).toBeInTheDocument();
    expect(screen.getByText('🌅')).toBeInTheDocument();
  });

  it('퇴근 모드를 올바르게 표시한다', () => {
    render(<ModeBadge mode="return" onToggle={vi.fn()} />);
    expect(screen.getByText('퇴근 모드')).toBeInTheDocument();
    expect(screen.getByText('🌆')).toBeInTheDocument();
  });

  it('야간 모드를 올바르게 표시한다', () => {
    render(<ModeBadge mode="night" onToggle={vi.fn()} />);
    expect(screen.getByText('내일 출근')).toBeInTheDocument();
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  it('클릭 시 onToggle 콜백을 호출한다', () => {
    const onToggle = vi.fn();
    render(<ModeBadge mode="commute" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('aria-label에 현재 모드와 전환 안내를 포함한다', () => {
    render(<ModeBadge mode="commute" onToggle={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '출근 모드 - 탭하여 모드 전환');
  });

  it('퇴근 모드의 aria-label이 올바르다', () => {
    render(<ModeBadge mode="return" onToggle={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '퇴근 모드 - 탭하여 모드 전환');
  });

  it('야간 모드의 aria-label이 올바르다', () => {
    render(<ModeBadge mode="night" onToggle={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '내일 출근 - 탭하여 모드 전환');
  });

  it.each<[CommuteMode, string]>([
    ['commute', '출근 모드'],
    ['return', '퇴근 모드'],
    ['night', '내일 출근'],
  ])('모드 "%s"일 때 레이블이 "%s"이다', (mode, expectedLabel) => {
    render(<ModeBadge mode={mode} onToggle={vi.fn()} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('emoji는 aria-hidden이다', () => {
    render(<ModeBadge mode="commute" onToggle={vi.fn()} />);
    const emojiSpan = screen.getByText('🌅');
    expect(emojiSpan).toHaveAttribute('aria-hidden', 'true');
  });

  it('button type이 button이다 (submit 방지)', () => {
    render(<ModeBadge mode="commute" onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
