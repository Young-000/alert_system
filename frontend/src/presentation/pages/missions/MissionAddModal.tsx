import { useState, useCallback } from 'react';
import { useFocusTrap } from '@presentation/hooks/useFocusTrap';
import type { MissionType, Mission } from '@infrastructure/api';

// ─── Constants ──────────────────────────────────────

const EMOJI_OPTIONS = [
  '📖', '📰', '🎧', '📝', '🧘', '💪',
  '📚', '✏️', '🎵', '📱', '🧠', '🎯',
  '🏃', '☕', '🍎', '💡', '🔥', '⭐',
  '🌟', '🎮',
] as const;

const SUGGESTED_MISSIONS: Record<MissionType, ReadonlyArray<{ emoji: string; title: string }>> = {
  commute: [
    { emoji: '📖', title: '영어 단어 외우기' },
    { emoji: '📰', title: '뉴스 읽기' },
    { emoji: '🎧', title: '팟캐스트 듣기' },
    { emoji: '📝', title: '일기 쓰기' },
    { emoji: '🧘', title: '명상하기' },
    { emoji: '💪', title: '스트레칭' },
  ],
  return: [
    { emoji: '📚', title: '독서하기' },
    { emoji: '✏️', title: '영어 문장 쓰기' },
    { emoji: '🎵', title: '음악 감상' },
    { emoji: '📱', title: 'SNS 정리' },
    { emoji: '🧠', title: '하루 복기' },
    { emoji: '🎯', title: '내일 계획 세우기' },
  ],
};

const MAX_TITLE_LENGTH = 20;

// ─── Types ──────────────────────────────────────────

type MissionAddModalProps = {
  open: boolean;
  missionType: MissionType;
  editingMission: Mission | null;
  isLoading: boolean;
  error?: string;
  onSave: (data: { title: string; emoji: string }) => void;
  onClose: () => void;
};

// ─── Component ──────────────────────────────────────

export function MissionAddModal({
  open,
  missionType,
  editingMission,
  isLoading,
  error,
  onSave,
  onClose,
}: MissionAddModalProps): JSX.Element | null {
  const [title, setTitle] = useState(editingMission?.title ?? '');
  const [emoji, setEmoji] = useState(editingMission?.emoji ?? '🎯');
  const [titleError, setTitleError] = useState('');

  const trapRef = useFocusTrap({
    active: open,
    onEscape: isLoading ? undefined : onClose,
  });

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_TITLE_LENGTH) {
      setTitle(value);
      if (titleError) setTitleError('');
    }
  }, [titleError]);

  const handleSuggestionClick = useCallback((suggestion: { emoji: string; title: string }) => {
    setTitle(suggestion.title);
    setEmoji(suggestion.emoji);
    setTitleError('');
  }, []);

  const handleEmojiSelect = useCallback((selected: string) => {
    setEmoji(selected);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('미션 이름을 입력해주세요');
      return;
    }
    if (trimmed.length < 2) {
      setTitleError('2글자 이상 입력해주세요');
      return;
    }
    onSave({ title: trimmed, emoji });
  }, [title, emoji, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isLoading]);

  if (!open) return null;

  const isEditing = editingMission !== null;
  const modalTitle = isEditing ? '미션 수정' : '미션 추가';
  const suggestions = SUGGESTED_MISSIONS[missionType];
  const typeLabel = missionType === 'commute' ? '출근' : '퇴근';

  return (
    <div
      className="msettings-modal-overlay"
      onClick={isLoading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-modal-title"
    >
      <div
        ref={trapRef}
        className="msettings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="msettings-modal-header">
          <h2 id="mission-modal-title" className="msettings-modal-title">
            {modalTitle}
          </h2>
          <button
            type="button"
            className="msettings-modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        {/* Type badge */}
        <div className="msettings-modal-type">
          <span className="msettings-type-badge">
            {missionType === 'commute' ? '🚌' : '🌙'} {typeLabel} 미션
          </span>
        </div>

        {/* Title input */}
        <div className="msettings-modal-field">
          <label htmlFor="mission-title" className="msettings-modal-label">
            미션 이름
          </label>
          <div className="msettings-input-wrap">
            <span className="msettings-input-emoji" aria-hidden="true">{emoji}</span>
            <input
              id="mission-title"
              type="text"
              className={`msettings-input ${titleError ? 'error' : ''}`}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="예: 영어 단어 외우기"
              maxLength={MAX_TITLE_LENGTH}
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
          <div className="msettings-input-meta">
            {titleError ? (
              <span className="msettings-input-error" role="alert">{titleError}</span>
            ) : (
              <span className="msettings-input-hint">&nbsp;</span>
            )}
            <span className="msettings-input-count">
              {title.length}/{MAX_TITLE_LENGTH}
            </span>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="msettings-modal-field">
          <span className="msettings-modal-label">아이콘</span>
          <div className="msettings-emoji-grid" role="radiogroup" aria-label="이모지 선택">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`msettings-emoji-btn ${emoji === opt ? 'selected' : ''}`}
                onClick={() => handleEmojiSelect(opt)}
                role="radio"
                aria-checked={emoji === opt}
                aria-label={opt}
                disabled={isLoading}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion chips */}
        {!isEditing && (
          <div className="msettings-modal-field">
            <span className="msettings-modal-label">추천 미션</span>
            <div className="msettings-suggestion-list">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  className={`msettings-suggestion-chip ${title === s.title && emoji === s.emoji ? 'active' : ''}`}
                  onClick={() => handleSuggestionClick(s)}
                  disabled={isLoading}
                >
                  <span aria-hidden="true">{s.emoji}</span> {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error ? (
          <p className="msettings-modal-error" role="alert">{error}</p>
        ) : null}

        {/* Actions */}
        <div className="msettings-modal-actions">
          <button
            type="button"
            className="msettings-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="button"
            className="msettings-btn-save"
            onClick={handleSubmit}
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                저장 중...
              </>
            ) : (
              isEditing ? '수정' : '추가'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
