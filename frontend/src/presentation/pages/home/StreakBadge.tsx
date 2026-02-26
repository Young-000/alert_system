import { memo, useState } from 'react';
import type { StreakResponse, MilestoneType } from '@infrastructure/api/commute-api.client';
import { WeeklyProgress } from './WeeklyProgress';
import { MilestoneBadgePanel } from './MilestoneBadgePanel';

interface StreakBadgeProps {
  streak: StreakResponse;
}

const MILESTONE_BADGES: Record<MilestoneType, { badge: string; badgeName: string }> = {
  '7d': { badge: '\u{1F949}', badgeName: '첫걸음' },
  '14d': { badge: '\u{1F3C3}', badgeName: '습관 형성' },
  '30d': { badge: '\u{1F948}', badgeName: '한 달 챔피언' },
  '60d': { badge: '\u{1F4AA}', badgeName: '철인' },
  '100d': { badge: '\u{1F947}', badgeName: '전설' },
};

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

export const StreakBadge = memo(function StreakBadge({ streak }: StreakBadgeProps): JSX.Element {
  const [showBadgePanel, setShowBadgePanel] = useState(false);
  const statusMsg = getStatusMessage(streak);
  const statusClass = getStatusClassName(streak);
  const earnedBadges = streak.milestonesAchieved ?? [];

  return (
    <>
      <section
        className={`streak-badge ${statusClass}`}
        aria-label={`연속 ${streak.currentStreak}일 스트릭`}
      >
        <div className="streak-badge-top">
          <div className="streak-count">
            <span className="streak-fire" aria-hidden="true">
              {streak.streakStatus === 'active' || streak.streakStatus === 'at_risk' ? '\u{1F525}' : '\u{1F4A4}'}
            </span>
            <span className="streak-count-value">연속 {streak.currentStreak}일</span>
          </div>
          {streak.bestStreak > 0 && streak.bestStreak > streak.currentStreak && (
            <span className="streak-best">최고 {streak.bestStreak}일</span>
          )}
        </div>

        {statusMsg && (
          <p className="streak-status-msg" role={streak.streakStatus === 'at_risk' ? 'alert' : undefined}>
            {streak.todayRecorded && <span aria-hidden="true">{'\u2713'} </span>}
            {statusMsg}
          </p>
        )}

        <WeeklyProgress
          weeklyCount={streak.weeklyCount}
          weeklyGoal={streak.weeklyGoal}
          todayRecorded={streak.todayRecorded}
          streakStatus={streak.streakStatus}
        />

        {earnedBadges.length > 0 && (
          <div className="streak-earned-badges">
            <button
              type="button"
              className="streak-badges-row"
              onClick={() => setShowBadgePanel(true)}
              aria-label={`획득한 배지 ${earnedBadges.length}개 보기`}
            >
              {earnedBadges.map((type) => {
                const info = MILESTONE_BADGES[type];
                return (
                  <span
                    key={type}
                    className="streak-earned-badge"
                    title={info?.badgeName ?? type}
                    aria-hidden="true"
                  >
                    {info?.badge ?? '\u{1F3C5}'}
                  </span>
                );
              })}
              <span className="streak-badges-label">배지 {earnedBadges.length}개</span>
            </button>
          </div>
        )}

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

      <MilestoneBadgePanel
        isOpen={showBadgePanel}
        onClose={() => setShowBadgePanel(false)}
        milestonesAchieved={earnedBadges}
        currentStreak={streak.currentStreak}
        nextMilestone={streak.nextMilestone}
      />
    </>
  );
});
