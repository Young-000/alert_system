import type { StreakStatus } from '@infrastructure/api/commute-api.client';

interface WeeklyProgressProps {
  weeklyCount: number;
  weeklyGoal: number;
  todayRecorded: boolean;
  streakStatus: StreakStatus;
}

const DAY_LABELS = ['월', '화', '수', '목', '금'] as const;

export function WeeklyProgress({
  weeklyCount,
  weeklyGoal,
  todayRecorded,
  streakStatus,
}: WeeklyProgressProps): JSX.Element {
  const goalMet = weeklyCount >= weeklyGoal;
  const dots = Array.from({ length: weeklyGoal }, (_, i) => i < weeklyCount);
  // Today is the next unfilled dot (or last filled if todayRecorded)
  const todayDotIndex = todayRecorded ? weeklyCount - 1 : weeklyCount;

  return (
    <div className="weekly-progress" aria-label={`이번 주 ${weeklyCount}/${weeklyGoal}`}>
      <span className="weekly-progress-label">
        이번 주 {weeklyCount}/{weeklyGoal}
        {goalMet && <span className="weekly-goal-met" aria-label="목표 달성"> 달성</span>}
      </span>
      <div className="weekly-dots" role="img" aria-hidden="true">
        {dots.map((filled, i) => {
          const isToday = i === todayDotIndex;
          const dotClass = [
            'weekly-dot',
            filled ? 'weekly-dot--filled' : '',
            goalMet ? 'weekly-dot--goal-met' : '',
            isToday && streakStatus === 'at_risk' ? 'weekly-dot--today-risk' : '',
            isToday && !filled ? 'weekly-dot--today' : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={i} className="weekly-dot-col">
              <div className={dotClass} />
              {i < DAY_LABELS.length && (
                <span className="weekly-dot-label">{DAY_LABELS[i]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
