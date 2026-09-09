import { useState, useCallback, useEffect } from 'react';
import type { WizardStep, TransportItem } from './types';

interface WizardNavigationProps {
  wantsWeather: boolean;
  wantsTransport: boolean;
  transportTypes: ('subway' | 'bus')[];
  selectedTransports: TransportItem[];
  deleteTarget: { id: string; name: string } | null;
  isSubmitting: boolean;
  success: string;
  /**
   * `generateSchedule`이 저장할 크론을 만들어 냈는지. 루틴 단계의 시각 입력을 비우면
   * 만들 수 없고(빈 문자열), 그대로 저장하면 서버는 통과시키지만 EventBridge 변환에서
   * 던져 알림이 만들어지지 않는다. 시각 검증을 여기서 다시 구현하지 않고 저장 경로가
   * 실제로 쓰는 값을 그대로 본다 — 갈라지면 화면과 저장이 서로 다른 규칙을 갖는다.
   */
  hasSchedule: boolean;
  onSubmit: () => void;
}

interface WizardNavigationState {
  step: WizardStep;
  showWizard: boolean;
}

interface WizardNavigationActions {
  setStep: (step: WizardStep) => void;
  setShowWizard: (show: boolean) => void;
  goNext: () => void;
  goBack: () => void;
  canProceed: () => boolean;
  getProgress: () => { current: number; total: number };
}

export function useWizardNavigation(
  props: WizardNavigationProps,
): WizardNavigationState & WizardNavigationActions {
  const {
    wantsWeather,
    wantsTransport,
    transportTypes,
    selectedTransports,
    deleteTarget,
    isSubmitting,
    success,
    hasSchedule,
    onSubmit,
  } = props;

  const [step, setStep] = useState<WizardStep>('type');
  const [showWizard, setShowWizard] = useState(false);

  const goNext = useCallback((): void => {
    if (step === 'type') {
      if (wantsTransport) {
        setStep('transport');
      } else if (wantsWeather) {
        setStep('routine');
      }
    } else if (step === 'transport') {
      setStep('station');
    } else if (step === 'station') {
      setStep('routine');
    } else if (step === 'routine') {
      setStep('confirm');
    }
  }, [step, wantsTransport, wantsWeather]);

  const goBack = useCallback((): void => {
    if (step === 'transport') setStep('type');
    else if (step === 'station') setStep('transport');
    else if (step === 'routine') {
      if (wantsTransport) setStep('station');
      else setStep('type');
    }
    else if (step === 'confirm') setStep('routine');
  }, [step, wantsTransport]);

  const canProceed = useCallback((): boolean => {
    if (step === 'type') return wantsWeather || wantsTransport;
    if (step === 'transport') return transportTypes.length > 0;
    if (step === 'station') return selectedTransports.length > 0;
    // 시각을 비운 채로는 확인 단계로 보내지 않는다. 넘어가면 미리보기가 빈 칸이 되고,
    // 저장은 원인을 알 수 없는 실패로 끝난다.
    if (step === 'routine') return hasSchedule;
    return hasSchedule;
  }, [
    step,
    wantsWeather,
    wantsTransport,
    transportTypes.length,
    selectedTransports.length,
    hasSchedule,
  ]);

  const getProgress = useCallback((): { current: number; total: number } => {
    const steps: WizardStep[] = ['type'];
    if (wantsTransport) {
      steps.push('transport', 'station');
    }
    steps.push('routine', 'confirm');

    const current = steps.indexOf(step) + 1;
    return { current, total: steps.length };
  }, [step, wantsTransport]);

  // Enter key to proceed to next step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (deleteTarget) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // 진행 조건은 `canProceed` 하나만 본다. 예전에는 여기서 같은 규칙을 다시 썼고,
      // 루틴 단계 조건이 추가되자 버튼은 막히는데 Enter로는 넘어가는 상태가 됐다.
      if (e.key === 'Enter' && canProceed()) {
        e.preventDefault();
        if (step === 'confirm' && !isSubmitting && !success) {
          onSubmit();
        } else if (step !== 'confirm') {
          goNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [step, deleteTarget, isSubmitting, success, canProceed, goNext, onSubmit]);

  return {
    step,
    showWizard,
    setStep,
    setShowWizard,
    goNext,
    goBack,
    canProceed,
    getProgress,
  };
}
