import { useState, useMemo, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────

export type CommuteMode = 'commute' | 'return' | 'night';

export interface UseCommuteModeReturn {
  /** Current effective mode (auto or manual override) */
  mode: CommuteMode;
  /** Convenience: mode === 'commute' */
  isCommute: boolean;
  /** Convenience: mode === 'return' */
  isReturn: boolean;
  /** Toggle between commute and return (manual override, session-level) */
  toggleMode: () => void;
}

// ─── Pure Functions ────────────────────────────────

/**
 * Determines the automatic commute mode based on current hour.
 * - commute: 06:00-13:59
 * - return:  14:00-20:59
 * - night:   21:00-05:59
 */
export function getAutoMode(hour?: number): CommuteMode {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 14) return 'commute';
  if (h >= 14 && h < 21) return 'return';
  return 'night';
}

// ─── Hook ──────────────────────────────────────────

/**
 * Manages commute/return mode with auto-detection and manual override.
 *
 * Auto mode: time-based (commute 06-13, return 14-20, night 21-05).
 * Manual toggle: overrides auto mode for the session (React state only).
 * Resets on page refresh.
 */
export function useCommuteMode(): UseCommuteModeReturn {
  const autoMode = getAutoMode();
  const [manualOverride, setManualOverride] = useState<CommuteMode | null>(null);

  const mode = manualOverride ?? autoMode;

  const toggleMode = useCallback(() => {
    setManualOverride(prev => {
      const current = prev ?? autoMode;
      return (current === 'commute' || current === 'night') ? 'return' : 'commute';
    });
  }, [autoMode]);

  return useMemo(() => ({
    mode,
    isCommute: mode === 'commute',
    isReturn: mode === 'return',
    toggleMode,
  }), [mode, toggleMode]);
}
