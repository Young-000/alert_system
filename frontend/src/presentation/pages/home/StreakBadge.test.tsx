import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StreakBadge } from './StreakBadge';
import type { StreakResponse } from '@infrastructure/api/commute-api.client';

function makeStreak(overrides: Partial<StreakResponse> = {}): StreakResponse {
  return {
    userId: 'u1',
    currentStreak: 12,
    bestStreak: 25,
    lastRecordDate: '2026-02-17',
    streakStartDate: '2026-02-06',
    weeklyGoal: 5,
    weeklyCount: 3,
    weekStartDate: '2026-02-17',
    milestonesAchieved: ['7d'],
    latestMilestone: '7d',
    nextMilestone: { type: '30d', label: '30일 연속', daysRemaining: 18, progress: 0.4 },
    streakStatus: 'active',
    excludeWeekends: false,
    reminderEnabled: true,
    todayRecorded: false,
    ...overrides,
  };
}

describe('StreakBadge', () => {
  it('연속 일수와 최고 기록을 표시한다', () => {
    render(<StreakBadge streak={makeStreak()} />);
    expect(screen.getByText('연속 12일')).toBeInTheDocument();
    expect(screen.getByText('최고 25일')).toBeInTheDocument();
  });

  it('현재가 최고 기록이면 최고 기록을 표시하지 않는다', () => {
    render(<StreakBadge streak={makeStreak({ currentStreak: 25, bestStreak: 25 })} />);
    expect(screen.queryByText(/최고/)).not.toBeInTheDocument();
  });

  it('todayRecorded일 때 완료 메시지를 표시한다', () => {
    render(<StreakBadge streak={makeStreak({ todayRecorded: true })} />);
    expect(screen.getByText(/오늘 기록 완료/)).toBeInTheDocument();
  });

  it('at_risk 상태에서 경고 메시지를 표시한다', () => {
    render(<StreakBadge streak={makeStreak({ streakStatus: 'at_risk' })} />);
    const msg = screen.getByText('오늘 기록하면 스트릭 유지!');
    expect(msg).toBeInTheDocument();
    expect(msg).toHaveAttribute('role', 'alert');
  });

  it('broken 상태에서 격려 메시지를 표시한다', () => {
    render(<StreakBadge streak={makeStreak({ streakStatus: 'broken', currentStreak: 0 })} />);
    expect(screen.getByText('다시 시작해보세요')).toBeInTheDocument();
  });

  it('new 상태에서 온보딩 메시지를 표시한다', () => {
    render(<StreakBadge streak={makeStreak({ streakStatus: 'new', currentStreak: 0, bestStreak: 0 })} />);
    expect(screen.getByText('첫 기록을 시작하세요')).toBeInTheDocument();
  });

  it('주간 진행률을 표시한다', () => {
    render(<StreakBadge streak={makeStreak()} />);
    expect(screen.getByText('이번 주 3/5')).toBeInTheDocument();
  });

  it('다음 마일스톤 진행률을 표시한다', () => {
    render(<StreakBadge streak={makeStreak()} />);
    expect(screen.getByText('30일 연속까지 18일')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
  });

  it('다음 마일스톤이 없으면 진행률 바를 표시하지 않는다', () => {
    render(<StreakBadge streak={makeStreak({ nextMilestone: null })} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('aria-label이 스트릭 일수를 포함한다', () => {
    render(<StreakBadge streak={makeStreak()} />);
    expect(screen.getByLabelText('연속 12일 스트릭')).toBeInTheDocument();
  });
});
