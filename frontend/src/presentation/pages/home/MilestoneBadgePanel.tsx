import { useFocusTrap } from '@presentation/hooks/useFocusTrap';
import type { MilestoneType, NextMilestone } from '@infrastructure/api/commute-api.client';

interface MilestoneBadgePanelProps {
  isOpen: boolean;
  onClose: () => void;
  milestonesAchieved: MilestoneType[];
  currentStreak: number;
  nextMilestone: NextMilestone | null;
}

interface MilestoneDisplayInfo {
  type: MilestoneType;
  days: number;
  badge: string;
  badgeName: string;
  label: string;
}

const ALL_MILESTONES: readonly MilestoneDisplayInfo[] = [
  { type: '7d', days: 7, badge: '\u{1F949}', badgeName: '첫걸음', label: '7일 연속' },
  { type: '14d', days: 14, badge: '\u{1F3C3}', badgeName: '습관 형성', label: '14일 연속' },
  { type: '30d', days: 30, badge: '\u{1F948}', badgeName: '한 달 챔피언', label: '30일 연속' },
  { type: '60d', days: 60, badge: '\u{1F4AA}', badgeName: '철인', label: '60일 연속' },
  { type: '100d', days: 100, badge: '\u{1F947}', badgeName: '전설', label: '100일 연속' },
] as const;

export function MilestoneBadgePanel({
  isOpen,
  onClose,
  milestonesAchieved,
  currentStreak,
  nextMilestone,
}: MilestoneBadgePanelProps): JSX.Element | null {
  const trapRef = useFocusTrap({
    active: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const achievedSet = new Set(milestonesAchieved);

  return (
    <div
      className="confirm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-panel-title"
    >
      <div
        ref={trapRef}
        className="confirm-modal badge-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="badge-panel-header">
          <h2 id="badge-panel-title" className="badge-panel-title">
            배지 컬렉션
          </h2>
          <p className="badge-panel-subtitle">
            연속 {currentStreak}일째 출퇴근 기록 중
          </p>
        </div>

        <ul className="badge-collection" role="list">
          {ALL_MILESTONES.map((m) => {
            const achieved = achievedSet.has(m.type);
            const isNext = nextMilestone?.type === m.type;
            const progress = isNext ? nextMilestone.progress : (achieved ? 1 : 0);
            const progressPct = Math.round(progress * 100);

            return (
              <li
                key={m.type}
                className={`badge-item ${achieved ? 'badge-item--earned' : 'badge-item--locked'} ${isNext ? 'badge-item--next' : ''}`}
              >
                <div className="badge-item-icon" aria-hidden="true">
                  {achieved ? m.badge : '\u{1F512}'}
                </div>
                <div className="badge-item-info">
                  <span className="badge-item-name">
                    {m.badgeName}
                    {achieved && <span className="badge-item-check" aria-label="획득 완료"> \u2713</span>}
                  </span>
                  <span className="badge-item-label">{m.label}</span>
                  {isNext && (
                    <div className="badge-item-progress">
                      <div
                        className="badge-item-progress-bar"
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${m.label} 진행률`}
                      >
                        <div
                          className="badge-item-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="badge-item-progress-text">
                        {nextMilestone?.daysRemaining}일 남음
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="btn btn-primary badge-panel-close-btn"
          onClick={onClose}
          autoFocus
        >
          닫기
        </button>
      </div>
    </div>
  );
}
