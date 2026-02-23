import { useCallback, useState } from 'react';

type ChallengeUpdate = {
  challengeId: string;
  templateName: string;
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  badgeEmoji: string;
  badgeName: string;
};

type CompletionModalState = {
  visible: boolean;
  badgeEmoji: string;
  badgeName: string;
  challengeName: string;
};

const INITIAL_MODAL_STATE: CompletionModalState = {
  visible: false,
  badgeEmoji: '',
  badgeName: '',
  challengeName: '',
};

type UseChallengeCompletionReturn = {
  modalState: CompletionModalState;
  handleChallengeUpdates: (updates: ChallengeUpdate[]) => void;
  hideCompletionModal: () => void;
};

export function useChallengeCompletion(): UseChallengeCompletionReturn {
  const [modalState, setModalState] = useState<CompletionModalState>(
    INITIAL_MODAL_STATE,
  );

  const handleChallengeUpdates = useCallback(
    (updates: ChallengeUpdate[]): void => {
      // Find the first completed challenge to show the modal
      const completed = updates.find((u) => u.isCompleted);
      if (!completed) return;

      setModalState({
        visible: true,
        badgeEmoji: completed.badgeEmoji,
        badgeName: completed.badgeName,
        challengeName: completed.templateName,
      });
    },
    [],
  );

  const hideCompletionModal = useCallback((): void => {
    setModalState(INITIAL_MODAL_STATE);
  }, []);

  return {
    modalState,
    handleChallengeUpdates,
    hideCompletionModal,
  };
}

export type { ChallengeUpdate };
