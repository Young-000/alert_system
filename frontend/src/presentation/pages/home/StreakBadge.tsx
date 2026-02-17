import type { StreakResponse } from '@infrastructure/api/commute-api.client';
import { WeeklyProgress } from './WeeklyProgress';

interface StreakBadgeProps {
  streak: StreakResponse;
}

function getStatusMessage(streak: StreakResponse): string {
  if (streak.streakStatus === 'new') return '첫 기록을 시작하세요';
  if (streak.streakStatus === 'broken') return '다시 시작해보세요';
  if (streak.streakStatus === 'at_risk') return '오늘 기록하면 스트릭 유지!';
  if (streak.todayRecorded) return '오늘 기록 완료';
  return '';
}

function getStatusClassName(streak: StreakResponse): string {
  if (streak.streakStatus === 'at_risk') return 'streak-badge--at-risk';
  if (streak.streakStatus === 'broken' || streak.streakStatus === 'new') return 'streak-badge--inactive';
  if (streak.todayRecorded) return 'streak-badge--done';
  return '';
}

export function StreakBadge({ streak }: StreakBadgeProps): JSX.Element {
  const statusMsg = getStatusMessage(streak);
  const statusClass = getStatusClassName(streak);

  return (
    <section
      className={`streak-badge ${statusClass}`}
      aria-label={`연속 ${streak.currentStreak}일 스트릭`}
    >
      <div className="streak-badge-top">
        <div className="streak-count">
          <span className="streak-fire" aria-hidden="true">
            {streak.streakStatus === 'active' || streak.streakStatus === 'at_risk' ? '🔥' : '💤'}
          </span>
          <span className="streak-count-value">연속 {streak.currentStreak}일</span>
        </div>
        {streak.bestStreak > 0 && streak.bestStreak > streak.currentStreak && (
          <span className="streak-best">최고 {streak.bestStreak}일</span>
        )}
      </div>

      {statusMsg && (
        <p className="streak-status-msg" role={streak.streakStatus === 'at_risk' ? 'alert' : undefined}>
          {streak.todayRecorded && <span aria-hidden="true">✓ </span>}
          {statusMsg}
        </p>
      )}

      <WeeklyProgress
        weeklyCount={streak.weeklyCount}
        weeklyGoal={streak.weeklyGoal}
        todayRecorded={streak.todayRecorded}
        streakStatus={streak.streakStatus}
      />

      {streak.nextMilestone && (
        <div className="streak-next-milestone">
          <span className="streak-milestone-label">
            {streak.nextMilestone.label}까지 {streak.nextMilestone.daysRemaining}일
          </span>
          <div
            className="streak-milestone-bar"
            role="progressbar"
            aria-valuenow={Math.round(streak.nextMilestone.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${streak.nextMilestone.label} 진행률`}
          >
            <div
              className="streak-milestone-fill"
              style={{ width: `${Math.round(streak.nextMilestone.progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
