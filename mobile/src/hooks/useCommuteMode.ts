import { useState, useMemo, useCallback } from 'react';

export type CommuteMode = 'commute' | 'return' | 'night';

type UseCommuteModeReturn = {
  mode: CommuteMode;
  isManualOverride: boolean;
  toggleMode: () => void;
  resetToAuto: () => void;
};

function getAutoMode(): CommuteMode {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'commute';
  if (hour >= 14 && hour < 21) return 'return';
  return 'night';
}

export function useCommuteMode(): UseCommuteModeReturn {
  const [manualMode, setManualMode] = useState<CommuteMode | null>(null);

  const autoMode = useMemo(() => getAutoMode(), []);
  const mode = manualMode ?? autoMode;
  const isManualOverride = manualMode !== null;

  const toggleMode = useCallback(() => {
    setManualMode((prev) => {
      const current = prev ?? autoMode;
      // Toggle between commute <-> return (skip night for manual)
      return current === 'commute' ? 'return' : 'commute';
    });
  }, [autoMode]);

  const resetToAuto = useCallback(() => {
    setManualMode(null);
  }, []);

  return { mode, isManualOverride, toggleMode, resetToAuto };
}
