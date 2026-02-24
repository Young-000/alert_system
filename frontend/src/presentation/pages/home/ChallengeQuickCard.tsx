import { Link } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { useActiveChallengesQuery, useBadgesQuery } from '@infrastructure/query';

export function ChallengeQuickCard(): JSX.Element | null {
  const { userId } = useAuth();
  const { data: activeData } = useActiveChallengesQuery(!!userId);
  const { data: badgesData } = useBadgesQuery(!!userId);

  if (!userId) return null;

  const activeCount = activeData?.challenges.length ?? 0;
  const earnedCount = badgesData?.earnedCount ?? 0;

  return (
    <Link to="/challenges" className="challenge-quick-card" aria-label="도전 목록 보기">
      <div className="challenge-quick-left">
        <span className="challenge-quick-icon" aria-hidden="true">🏆</span>
        <div className="challenge-quick-info">
          <span className="challenge-quick-title">도전</span>
          <span className="challenge-quick-detail">
            {activeCount > 0
              ? `${activeCount}개 진행중`
              : '새로운 도전을 시작해보세요'}
          </span>
        </div>
      </div>
      <div className="challenge-quick-right">
        {earnedCount > 0 && (
          <span className="challenge-quick-badge-count">🏅 {earnedCount}</span>
        )}
        <span className="challenge-quick-arrow" aria-hidden="true">&rsaquo;</span>
      </div>
    </Link>
  );
}
