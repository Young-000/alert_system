import { useFocusTrap } from '@presentation/hooks/useFocusTrap';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: {
    type: string;
    label: string;
  };
  currentStreak: number;
  nextMilestone: {
    label: string;
    daysRemaining: number;
  } | null;
}

const MILESTONE_ICONS: Record<string, string> = {
  '7d': '\u{1F949}',
  '14d': '\u{1F3C3}',
  '30d': '\u{1F948}',
  '60d': '\u{1F4AA}',
  '100d': '\u{1F947}',
};

export function MilestoneModal({
  isOpen,
  onClose,
  milestone,
  currentStreak,
  nextMilestone,
}: MilestoneModalProps): JSX.Element | null {
  const trapRef = useFocusTrap({
    active: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const icon = MILESTONE_ICONS[milestone.type] ?? '🏅';

  return (
    <div
      className="confirm-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-modal-title"
    >
      <div
        ref={trapRef}
        className="confirm-modal milestone-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="milestone-modal-icon" aria-hidden="true">{icon}</div>
        <h2 id="milestone-modal-title" className="milestone-modal-title">
          {milestone.label} 달성!
        </h2>
        <p className="milestone-modal-desc">
          꾸준히 기록하고 있네요! 연속 {currentStreak}일째입니다.
        </p>
        {nextMilestone && (
          <p className="milestone-modal-next">
            다음 목표: {nextMilestone.label} ({nextMilestone.daysRemaining}일 남음)
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary milestone-modal-btn"
          onClick={onClose}
          autoFocus
        >
          확인
        </button>
      </div>
    </div>
  );
}
