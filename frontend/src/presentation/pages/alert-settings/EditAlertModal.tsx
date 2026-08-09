import { useFocusTrap } from '@presentation/hooks/useFocusTrap';
import { cronToHuman, applyTimeToCron } from './cron-utils';

interface EditAlertModalProps {
  readonly editForm: { name: string; schedule: string };
  /** 수정 전 원본 크론. 하루 여러 번 울리는 알림임을 사용자에게 보여주는 데 쓴다. */
  readonly originalSchedule: string;
  readonly isEditing: boolean;
  readonly onFormChange: (form: { name: string; schedule: string }) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function EditAlertModal({
  editForm,
  originalSchedule,
  isEditing,
  onFormChange,
  onConfirm,
  onCancel,
}: EditAlertModalProps): JSX.Element {
  // 시각 입력은 하나뿐이지만 알림은 하루 여러 번 울릴 수 있다 — 저장 후 결과를 미리 보여준다.
  const resultingSchedule = cronToHuman(
    applyTimeToCron(originalSchedule, editForm.schedule),
  );
  const trapRef = useFocusTrap({
    active: true,
    onEscape: isEditing ? undefined : onCancel,
  });

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div ref={trapRef} className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <h2 id="edit-modal-title" className="modal-title">알림 수정</h2>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="edit-name">알림 이름</label>
            <input
              id="edit-name"
              type="text"
              value={editForm.name}
              onChange={(e) => onFormChange({ ...editForm, name: e.target.value })}
              className="form-input"
              placeholder="알림 이름"
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-schedule">알림 시간</label>
            <input
              id="edit-schedule"
              type="time"
              value={editForm.schedule}
              onChange={(e) => onFormChange({ ...editForm, schedule: e.target.value })}
              className="form-input"
            />
            <p
              className="muted"
              style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}
              data-testid="edit-schedule-preview"
            >
              저장하면 <strong>{resultingSchedule}</strong>에 울립니다.
            </p>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            알림 유형 변경은 새로운 알림을 생성해주세요.
          </p>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isEditing}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isEditing || !editForm.name.trim()}
          >
            {isEditing ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
