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
    if (step === 'routine') return true;
    return true;
  }, [step, wantsWeather, wantsTransport, transportTypes.length, selectedTransports.length]);

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

      const canProceedNow = (() => {
        if (step === 'type') return wantsWeather || wantsTransport;
        if (step === 'transport') return transportTypes.length > 0;
        if (step === 'station') return selectedTransports.length > 0;
        return true;
      })();

      if (e.key === 'Enter' && canProceedNow) {
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
  }, [step, deleteTarget, isSubmitting, success, wantsWeather, wantsTransport, transportTypes.length, selectedTransports.length, goNext, onSubmit]);

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
