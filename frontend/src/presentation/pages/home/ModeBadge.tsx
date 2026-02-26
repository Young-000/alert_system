import type { CommuteMode } from './use-commute-mode';

// ─── Types ─────────────────────────────────────────

interface ModeBadgeProps {
  mode: CommuteMode;
  onToggle: () => void;
}

// ─── Config ────────────────────────────────────────

const MODE_CONFIG: Record<CommuteMode, { emoji: string; label: string }> = {
  commute: { emoji: '\uD83C\uDF05', label: '\uCD9C\uADFC \uBAA8\uB4DC' },
  return:  { emoji: '\uD83C\uDF06', label: '\uD1F4\uADFC \uBAA8\uB4DC' },
  night:   { emoji: '\uD83C\uDF19', label: '\uB0B4\uC77C \uCD9C\uADFC' },
};

// ─── Component ─────────────────────────────────────

export function ModeBadge({ mode, onToggle }: ModeBadgeProps): JSX.Element {
  const { emoji, label } = MODE_CONFIG[mode];

  return (
    <button
      type="button"
      className="mode-badge"
      onClick={onToggle}
      aria-label={`${label} - \uD0ED\uD558\uC5EC \uBAA8\uB4DC \uC804\uD658`}
    >
      <span className="mode-badge-emoji" aria-hidden="true">{emoji}</span>
      <span className="mode-badge-label">{label}</span>
    </button>
  );
}
