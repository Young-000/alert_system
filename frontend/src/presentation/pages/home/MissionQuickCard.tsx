import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useDailyStatusQuery, useWeeklyStatsQuery, useMissionStreakQuery } from '@infrastructure/query';

export function MissionQuickCard(): JSX.Element | null {
  const { userId } = useAuth();
  const { data: dailyStatus } = useDailyStatusQuery();
  const { data: weeklyStats } = useWeeklyStatsQuery();
  const { data: streakData } = useMissionStreakQuery();

  if (!userId) return null;

  const totalMissions = dailyStatus?.totalMissions ?? 0;
  const completedMissions = dailyStatus?.completedMissions ?? 0;
  const streakDay = streakData?.streakDay ?? dailyStatus?.streakDay ?? 0;
  const weeklyRate = weeklyStats?.completionRate ?? 0;
  const progressPercent = totalMissions > 0
    ? Math.round((completedMissions / totalMissions) * 100)
    : 0;

  if (totalMissions === 0) {
    return (
      <Link
        to="/missions/settings"
        className="mission-quick-card"
        aria-label="미션 설정하기"
      >
        <div className="mission-quick-left">
          <span className="mission-quick-icon" aria-hidden="true">
            <MissionIconSvg />
          </span>
          <div className="mission-quick-info">
            <span className="mission-quick-title">미션</span>
            <span className="mission-quick-detail">
              미션을 설정해보세요!
            </span>
          </div>
        </div>
        <div className="mission-quick-right">
          <span className="mission-quick-arrow" aria-hidden="true">&rsaquo;</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/missions"
      className="mission-quick-card"
      aria-label="오늘의 미션 체크하기"
    >
      <div className="mission-quick-content">
        <div className="mission-quick-top">
          <div className="mission-quick-left">
            <span className="mission-quick-icon" aria-hidden="true">
              <MissionIconSvg />
            </span>
            <div className="mission-quick-info">
              <span className="mission-quick-title">
                오늘의 미션 {completedMissions}/{totalMissions}
              </span>
              <div className="mission-quick-badges">
                {streakDay > 0 && (
                  <span className="mission-quick-badge mission-quick-badge--streak">
                    {streakDay}일 연속
                  </span>
                )}
                {weeklyRate > 0 && (
                  <span className="mission-quick-badge mission-quick-badge--weekly">
                    이번 주 {Math.round(weeklyRate)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mission-quick-right">
            <span className="mission-quick-cta">체크하기</span>
            <span className="mission-quick-arrow" aria-hidden="true">&rsaquo;</span>
          </div>
        </div>
        <div
          className="mission-quick-progress"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`미션 진행률 ${progressPercent}%`}
        >
          <div
            className="mission-quick-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function MissionIconSvg(): JSX.Element {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="var(--primary)" />
    </svg>
  );
}
