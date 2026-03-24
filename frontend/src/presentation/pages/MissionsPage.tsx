import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import {
  useDailyStatusQuery,
  useToggleCheckMutation,
  useWeeklyStatsQuery,
} from '@infrastructure/query';
import type { MissionWithRecord, MissionScore } from '@infrastructure/api';

// ─── Constants ──────────────────────────────────────

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const DAY_INDICATOR = {
  full: '\u2705',    // check mark
  partial: '\u25D0', // half circle
  empty: '\u2B1C',   // white square
} as const;

// ─── Helpers ────────────────────────────────────────

function formatToday(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[now.getDay()];
  return `${month}월 ${date}일 (${dayName})`;
}

function getKstDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

function getDayIndicator(rate: number): { symbol: string; className: string } {
  if (rate >= 100) return { symbol: DAY_INDICATOR.full, className: 'full' };
  if (rate > 0) return { symbol: DAY_INDICATOR.partial, className: 'partial' };
  return { symbol: DAY_INDICATOR.empty, className: 'empty' };
}

function getTodayKstDayIndex(): number {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 6 : day - 1;
}

// ─── Sub-components ─────────────────────────────────

function MissionCheckItem({
  item,
  onToggle,
  isToggling,
}: {
  item: MissionWithRecord;
  onToggle: (missionId: string) => void;
  isToggling: boolean;
}): JSX.Element {
  const { mission, isCompleted } = item;

  const handleClick = useCallback(() => {
    if (isToggling) return;
    onToggle(mission.id);
  }, [mission.id, onToggle, isToggling]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <div
      className={`mission-check-card ${isCompleted ? 'completed' : ''} ${isToggling ? 'toggling' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={isCompleted}
      aria-label={`${mission.title} ${isCompleted ? '완료' : '미완료'}`}
      tabIndex={0}
    >
      <div className={`mission-checkbox ${isCompleted ? 'checked' : ''}`}>
        <span className="mission-checkbox-icon" aria-hidden="true">
          ✓
        </span>
      </div>
      <div className="mission-info">
        <span className="mission-emoji" aria-hidden="true">
          {mission.emoji}
        </span>
        <span className="mission-title">{mission.title}</span>
      </div>
    </div>
  );
}

function MissionCheckSection({
  title,
  emoji,
  items,
  completedCount,
  totalCount,
  onToggle,
  togglingId,
}: {
  title: string;
  emoji: string;
  items: MissionWithRecord[];
  completedCount: number;
  totalCount: number;
  onToggle: (missionId: string) => void;
  togglingId: string | null;
}): JSX.Element {
  return (
    <section className="mission-section">
      <div className="mission-section-header">
        <h2 className="mission-section-title">
          {emoji} {title}
        </h2>
        <span className="mission-section-count">
          {completedCount}/{totalCount}
        </span>
      </div>
      {items.map((item) => (
        <MissionCheckItem
          key={item.mission.id}
          item={item}
          onToggle={onToggle}
          isToggling={togglingId === item.mission.id}
        />
      ))}
    </section>
  );
}

function StatsCard({
  completedMissions,
  totalMissions,
  completionRate,
  streakDay,
}: {
  completedMissions: number;
  totalMissions: number;
  completionRate: number;
  streakDay: number;
}): JSX.Element {
  const isComplete = completionRate >= 100;

  return (
    <div className="mission-stats-card">
      <div className="mission-stats-row">
        <div className="mission-stat-item">
          <span className="mission-stat-value">
            {completedMissions}/{totalMissions}
          </span>
          <span className="mission-stat-label">오늘 달성</span>
        </div>
        <div className="mission-stat-divider" />
        <div className="mission-stat-item">
          <span className="mission-stat-value mission-streak">
            <span className="mission-streak-fire" aria-hidden="true">
              🔥
            </span>
            {streakDay}일
          </span>
          <span className="mission-stat-label">연속 달성</span>
        </div>
      </div>
      <div className="mission-progress">
        <div className="mission-progress-track">
          <div
            className={`mission-progress-fill ${isComplete ? 'complete' : ''}`}
            style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
          />
        </div>
        <div className="mission-progress-label">
          <span className="mission-progress-text">오늘 달성률</span>
          <span className={`mission-progress-percent ${isComplete ? 'complete' : ''}`}>
            {Math.round(completionRate)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function WeeklyOverview({
  dailyScores,
  weeklyRate,
}: {
  dailyScores: MissionScore[];
  weeklyRate: number;
}): JSX.Element {
  const todayIndex = getTodayKstDayIndex();

  const weekData = useMemo(() => {
    const data = DAY_LABELS.map((label, i) => ({
      label,
      indicator: getDayIndicator(0),
      isToday: i === todayIndex,
    }));

    for (const score of dailyScores) {
      const dayIdx = getKstDayOfWeek(score.date);
      if (dayIdx >= 0 && dayIdx < 7) {
        data[dayIdx] = {
          ...data[dayIdx],
          indicator: getDayIndicator(score.completionRate),
        };
      }
    }

    return data;
  }, [dailyScores, todayIndex]);

  return (
    <div className="weekly-overview">
      <h3 className="weekly-overview-title">이번 주</h3>
      <div className="weekly-grid" role="list" aria-label="이번 주 달성 현황">
        {weekData.map((day) => (
          <div key={day.label} className="weekly-day" role="listitem">
            <span className={`weekly-day-label ${day.isToday ? 'today' : ''}`}>
              {day.label}
            </span>
            <span
              className={`weekly-day-indicator ${day.indicator.className} ${day.isToday ? 'today' : ''}`}
              aria-label={`${day.label}요일 ${day.indicator.className === 'full' ? '완료' : day.indicator.className === 'partial' ? '부분 달성' : '미달성'}`}
            >
              {day.indicator.symbol}
            </span>
          </div>
        ))}
      </div>
      <div className="weekly-summary">
        <span className="weekly-summary-text">주간 달성률</span>
        <span className="weekly-summary-rate">{Math.round(weeklyRate)}%</span>
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="mission-empty">
      <span className="mission-empty-icon" aria-hidden="true">
        🎯
      </span>
      <p className="mission-empty-title">출퇴근을 알차게!</p>
      <p className="mission-empty-text">
        출퇴근 시간에 하고 싶은 미션을
        <br />
        설정해보세요.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => navigate('/missions/settings')}
      >
        미션 설정하기
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────

export function MissionsPage(): JSX.Element {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const {
    data: dailyStatus,
    isLoading: isDailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useDailyStatusQuery();

  const {
    data: weeklyStats,
    isLoading: isWeeklyLoading,
  } = useWeeklyStatsQuery();

  const toggleMutation = useToggleCheckMutation();

  const togglingId = toggleMutation.isPending
    ? (toggleMutation.variables ?? null)
    : null;

  const handleToggle = useCallback(
    (missionId: string) => {
      if (toggleMutation.isPending) return;
      toggleMutation.mutate(missionId);
    },
    [toggleMutation],
  );

  const commuteCounts = useMemo(() => {
    if (!dailyStatus) return { completed: 0, total: 0 };
    const completed = dailyStatus.commuteMissions.filter((m) => m.isCompleted).length;
    return { completed, total: dailyStatus.commuteMissions.length };
  }, [dailyStatus]);

  const returnCounts = useMemo(() => {
    if (!dailyStatus) return { completed: 0, total: 0 };
    const completed = dailyStatus.returnMissions.filter((m) => m.isCompleted).length;
    return { completed, total: dailyStatus.returnMissions.length };
  }, [dailyStatus]);

  const hasMissions = dailyStatus
    ? dailyStatus.commuteMissions.length > 0 || dailyStatus.returnMissions.length > 0
    : false;

  const isLoading = isDailyLoading || isWeeklyLoading;

  // ── Auth required ──
  if (!userId) {
    return (
      <main className="page missions-page">
        <div className="mission-auth-required">
          <span className="mission-auth-icon" aria-hidden="true">🔒</span>
          <p>로그인이 필요한 기능이에요</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
            로그인
          </button>
        </div>
      </main>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <main className="page missions-page">
        <header className="missions-header">
          <div className="missions-header-left">
            <button
              type="button"
              className="missions-back"
              onClick={() => navigate(-1)}
              aria-label="뒤로 가기"
            >
              &lt;
            </button>
            <h1 className="missions-title">오늘의 미션</h1>
          </div>
        </header>
        <div className="missions-skeleton">
          <div className="skeleton skeleton-card" style={{ height: 80 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 60 }} />
          <div className="skeleton skeleton-card" style={{ height: 120 }} />
        </div>
      </main>
    );
  }

  // ── Error ──
  if (dailyError) {
    return (
      <main className="page missions-page">
        <header className="missions-header">
          <div className="missions-header-left">
            <button
              type="button"
              className="missions-back"
              onClick={() => navigate(-1)}
              aria-label="뒤로 가기"
            >
              &lt;
            </button>
            <h1 className="missions-title">오늘의 미션</h1>
          </div>
        </header>
        <div className="mission-error" role="alert">
          <p>데이터를 불러오는 데 실패했습니다.</p>
          <button
            type="button"
            className="btn-retry"
            onClick={() => void refetchDaily()}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page missions-page">
      {/* Header */}
      <header className="missions-header">
        <div className="missions-header-left">
          <button
            type="button"
            className="missions-back"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
          >
            &lt;
          </button>
          <h1 className="missions-title">오늘의 미션</h1>
        </div>
        <span className="missions-date">{formatToday()}</span>
      </header>

      {/* Empty state or mission content */}
      {!hasMissions ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats card */}
          {dailyStatus ? (
            <StatsCard
              completedMissions={dailyStatus.completedMissions}
              totalMissions={dailyStatus.totalMissions}
              completionRate={dailyStatus.completionRate}
              streakDay={dailyStatus.streakDay}
            />
          ) : null}

          {/* Commute missions */}
          {dailyStatus && dailyStatus.commuteMissions.length > 0 ? (
            <MissionCheckSection
              title="출근 미션"
              emoji="🚌"
              items={dailyStatus.commuteMissions}
              completedCount={commuteCounts.completed}
              totalCount={commuteCounts.total}
              onToggle={handleToggle}
              togglingId={togglingId}
            />
          ) : null}

          {/* Return missions */}
          {dailyStatus && dailyStatus.returnMissions.length > 0 ? (
            <MissionCheckSection
              title="퇴근 미션"
              emoji="🌙"
              items={dailyStatus.returnMissions}
              completedCount={returnCounts.completed}
              totalCount={returnCounts.total}
              onToggle={handleToggle}
              togglingId={togglingId}
            />
          ) : null}

          {/* Weekly overview */}
          {weeklyStats ? (
            <WeeklyOverview
              dailyScores={weeklyStats.dailyScores}
              weeklyRate={weeklyStats.completionRate}
            />
          ) : null}
        </>
      )}

      {/* Footer: manage button */}
      <div className="mission-footer">
        <button
          type="button"
          className="mission-manage-btn"
          onClick={() => navigate('/missions/settings')}
        >
          <span className="mission-manage-icon" aria-hidden="true">⚙️</span>
          미션 관리
        </button>
      </div>
    </main>
  );
}
