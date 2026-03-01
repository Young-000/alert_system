import { useState, useCallback } from 'react';

const MAX_TIP_LENGTH = 100;
const MAX_DAILY_TIPS = 3;

interface TipFormProps {
  checkpointKey: string;
  onSubmit: (checkpointKey: string, content: string) => void;
  isSubmitting?: boolean;
  isEligible?: boolean;
  isRateLimited?: boolean;
}

export function TipForm({
  checkpointKey,
  onSubmit,
  isSubmitting = false,
  isEligible = true,
  isRateLimited = false,
}: TipFormProps): JSX.Element {
  const [content, setContent] = useState('');
  const charCount = content.length;
  const isOverLimit = charCount > MAX_TIP_LENGTH;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting && !isRateLimited;

  const handleSubmit = useCallback((): void => {
    if (!canSubmit) return;
    onSubmit(checkpointKey, content.trim());
    setContent('');
  }, [canSubmit, checkpointKey, content, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!isEligible) {
    return (
      <div className="tip-form">
        <p className="tip-form-disabled-msg">
          3회 이상 출퇴근 기록 후 팁을 남길 수 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="tip-form">
      <div className="tip-form-input-wrapper">
        <textarea
          className="tip-form-input"
          placeholder="이 구간 팁을 남겨보세요 (100자)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_TIP_LENGTH + 10}
          rows={2}
          aria-label="팁 작성"
          disabled={isSubmitting}
        />
        <span
          className={`tip-form-char-count ${isOverLimit ? 'tip-form-char-count--over' : ''}`}
          aria-live="polite"
        >
          {charCount}/{MAX_TIP_LENGTH}
        </span>
      </div>

      <div className="tip-form-footer">
        <span className="tip-form-rate-limit">
          {isRateLimited
            ? `오늘은 팁을 ${MAX_DAILY_TIPS}개까지 남길 수 있어요`
            : ''}
        </span>
        <button
          type="button"
          className="tip-form-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? '등록 중...' : '등록'}
        </button>
      </div>
    </div>
  );
}
