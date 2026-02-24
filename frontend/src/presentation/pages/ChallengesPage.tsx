import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import {
  useChallengeTemplatesQuery,
  useActiveChallengesQuery,
  useBadgesQuery,
  useJoinChallengeMutation,
  useAbandonChallengeMutation,
} from '@infrastructure/query';
import type {
  ActiveChallenge,
  ChallengeTemplate,
  ChallengeDifficulty,
  Badge,
} from '@infrastructure/api';
import '../styles/pages/challenges.css';

// ─── Difficulty helpers ───────────────────────────────

const DIFFICULTY_CONFIG: Record<ChallengeDifficulty, { label: string; className: string }> = {
  easy: { label: '쉬움', className: 'difficulty-easy' },
  medium: { label: '보통', className: 'difficulty-medium' },
  hard: { label: '어려움', className: 'difficulty-hard' },
};

// ─── Sub-components ───────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: ChallengeDifficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty];
  return <span className={`challenge-difficulty ${config.className}`}>{config.label}</span>;
}

function BadgeCollection({
  badges,
  totalBadges,
  earnedCount,
}: {
  badges: Badge[];
  totalBadges: number;
  earnedCount: number;
}) {
  return (
    <section className="challenge-section">
      <div className="badge-collection-header">
        <h2 className="challenge-section-title">획득한 배지</h2>
        <span className="badge-collection-count">
          {earnedCount}/{totalBadges}
        </span>
      </div>
      {badges.length === 0 ? (
        <div className="challenge-empty">
          <span className="challenge-empty-icon" aria-hidden="true">🏅</span>
          <p className="challenge-empty-text">아직 획득한 배지가 없어요</p>
          <p className="challenge-empty-sub">도전을 완료하면 배지를 받을 수 있어요</p>
        </div>
      ) : (
        <div className="badge-grid">
          {badges.map((badge) => (
            <div key={badge.id} className="badge-item" title={badge.badgeName}>
              <span className="badge-item-emoji">{badge.badgeEmoji}</span>
              <span className="badge-item-name">{badge.badgeName}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActiveChallengeCard({
  challenge,
  onAbandon,
  isAbandoning,
}: {
  challenge: ActiveChallenge;
  onAbandon: (id: string) => void;
  isAbandoning: boolean;
}) {
  const percent = Math.min(100, Math.max(0, challenge.progressPercent));

  const handleAbandon = useCallback(() => {
    if (isAbandoning) return;
    if (window.confirm(`"${challenge.template.name}"을 정말 포기하시겠습니까?\n진행률이 초기화됩니다.`)) {
      onAbandon(challenge.id);
    }
  }, [challenge.id, challenge.template.name, onAbandon, isAbandoning]);

  return (
    <div className="active-challenge-card">
      <div className="active-challenge-header">
        <div className="active-challenge-title">
          <span className="active-challenge-emoji" aria-hidden="true">
            {challenge.template.badgeEmoji}
          </span>
          <span className="active-challenge-name">{challenge.template.name}</span>
        </div>
        <span className={`active-challenge-dday ${challenge.daysRemaining <= 3 ? 'urgent' : ''}`}>
          {challenge.daysRemaining <= 0 ? 'D-Day' : `D-${challenge.daysRemaining}`}
        </span>
      </div>

      <div className="active-challenge-progress">
        <div className="progress-track">
          <div
            className={`progress-fill ${challenge.isCloseToCompletion ? 'close-to-complete' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="progress-label">
          {challenge.currentProgress}/{challenge.targetProgress}
        </span>
      </div>

      <div className="active-challenge-footer">
        <DifficultyBadge difficulty={challenge.template.difficulty as ChallengeDifficulty} />
        <button
          type="button"
          className="btn-abandon"
          onClick={handleAbandon}
          disabled={isAbandoning}
          aria-label={`${challenge.template.name} 도전 포기`}
        >
          포기
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isJoining,
  onJoin,
}: {
  template: ChallengeTemplate;
  isJoining: boolean;
  onJoin: (id: string) => void;
}) {
  const statusLabel = template.isCompleted ? '완료' : template.isJoined ? '진행중' : '시작';
  const isDisabled = template.isJoined || template.isCompleted || isJoining;

  const btnClass = template.isCompleted
    ? 'btn-challenge btn-completed'
    : template.isJoined
      ? 'btn-challenge btn-in-progress'
      : 'btn-challenge btn-start';

  return (
    <div className="template-card">
      <div className="template-left">
        <span className="template-emoji" aria-hidden="true">{template.badgeEmoji}</span>
        <div className="template-info">
          <div className="template-name-row">
            <span className="template-name">{template.name}</span>
            <DifficultyBadge difficulty={template.difficulty} />
          </div>
          <p className="template-description">{template.description}</p>
        </div>
      </div>
      <button
        type="button"
        className={btnClass}
        onClick={() => !isDisabled && onJoin(template.id)}
        disabled={isDisabled}
        aria-label={`${template.name} ${statusLabel}`}
      >
        {isJoining ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          statusLabel
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

export function ChallengesPage(): JSX.Element {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [abandoningId, setAbandoningId] = useState<string | null>(null);

  const {
    data: templatesData,
    isLoading: isTemplatesLoading,
    error: templatesError,
  } = useChallengeTemplatesQuery(!!userId);

  const {
    data: activeData,
    isLoading: isActiveLoading,
  } = useActiveChallengesQuery(!!userId);

  const {
    data: badgesData,
    isLoading: isBadgesLoading,
  } = useBadgesQuery(!!userId);

  const joinMutation = useJoinChallengeMutation();
  const abandonMutation = useAbandonChallengeMutation();

  const handleJoin = useCallback(async (templateId: string) => {
    if (joiningId) return;
    setJoiningId(templateId);
    try {
      await joinMutation.mutateAsync(templateId);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        alert('이미 진행 중인 동일 도전이 있습니다.');
      } else if (status === 400) {
        alert('동시 진행 가능한 도전은 최대 3개입니다.');
      } else {
        alert('도전 참가에 실패했습니다.');
      }
    } finally {
      setJoiningId(null);
    }
  }, [joiningId, joinMutation]);

  const handleAbandon = useCallback(async (challengeId: string) => {
    setAbandoningId(challengeId);
    try {
      await abandonMutation.mutateAsync(challengeId);
    } catch {
      alert('도전 포기에 실패했습니다.');
    } finally {
      setAbandoningId(null);
    }
  }, [abandonMutation]);

  const groupedTemplates = useMemo(() => {
    if (!templatesData) return [];
    const { templates, categories } = templatesData;
    return categories
      .map((cat) => ({
        ...cat,
        items: templates.filter((t) => t.category === cat.key),
      }))
      .filter((group) => group.items.length > 0);
  }, [templatesData]);

  const isLoading = isTemplatesLoading || isActiveLoading || isBadgesLoading;

  // ── Auth required ──
  if (!userId) {
    return (
      <main className="page challenges-page">
        <div className="challenge-auth-required">
          <span className="challenge-auth-icon" aria-hidden="true">🔒</span>
          <p>로그인이 필요한 기능이에요</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/login')}>
            로그인
          </button>
        </div>
      </main>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <main className="page challenges-page">
        <header className="challenges-header">
          <button
            type="button"
            className="challenges-back"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
          >
            &lt;
          </button>
          <h1 className="challenges-title">도전 목록</h1>
        </header>
        <div className="challenges-skeleton">
          <div className="skeleton-card" style={{ height: 120 }} />
          <div className="skeleton-card" style={{ height: 80 }} />
          <div className="skeleton-card" style={{ height: 80 }} />
          <div className="skeleton-card" style={{ height: 80 }} />
        </div>
      </main>
    );
  }

  return (
    <main className="page challenges-page">
      <header className="challenges-header">
        <button
          type="button"
          className="challenges-back"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          &lt;
        </button>
        <h1 className="challenges-title">도전 목록</h1>
      </header>

      {/* Error notice */}
      {templatesError ? (
        <div className="notice error" role="alert">
          데이터를 불러오는 데 실패했습니다.
        </div>
      ) : null}

      {/* Badge collection */}
      {badgesData ? (
        <BadgeCollection
          badges={badgesData.badges}
          totalBadges={badgesData.totalBadges}
          earnedCount={badgesData.earnedCount}
        />
      ) : null}

      {/* Active challenges */}
      {activeData && activeData.challenges.length > 0 ? (
        <section className="challenge-section">
          <h2 className="challenge-section-title">내 도전</h2>
          {activeData.challenges.map((challenge) => (
            <ActiveChallengeCard
              key={challenge.id}
              challenge={challenge}
              onAbandon={handleAbandon}
              isAbandoning={abandoningId === challenge.id}
            />
          ))}
        </section>
      ) : null}

      {/* Template categories */}
      {groupedTemplates.length === 0 ? (
        <div className="challenge-empty">
          <span className="challenge-empty-icon" aria-hidden="true">📋</span>
          <p className="challenge-empty-text">아직 등록된 도전이 없어요</p>
        </div>
      ) : (
        groupedTemplates.map((group) => (
          <section key={group.key} className="challenge-section">
            <h2 className="challenge-section-title">
              {group.emoji} {group.label}
            </h2>
            {group.items.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isJoining={joiningId === template.id}
                onJoin={handleJoin}
              />
            ))}
          </section>
        ))
      )}
    </main>
  );
}
