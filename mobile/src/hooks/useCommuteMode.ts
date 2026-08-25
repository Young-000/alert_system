import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';

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
  const [autoMode, setAutoMode] = useState<CommuteMode>(getAutoMode);

  // 홈은 탭 화면이라 한 번 뜨면 계속 살아 있다. `useMemo(…, [])`로 마운트 때
  // 한 번만 계산하면 앱을 켜 둔 채 저녁이 되어도 인사말과 배지가 "출근 모드"에
  // 멈춘다. 같은 화면의 날씨·교통은 포그라운드 복귀 때 갱신되므로(useHomeData)
  // 모드만 과거에 남아 어긋난다. 같은 신호로 다시 계산한다.
  // 수동 전환(manualMode)은 사용자의 선택이므로 건드리지 않는다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setAutoMode(getAutoMode());
      }
    });

    return () => subscription.remove();
  }, []);

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
