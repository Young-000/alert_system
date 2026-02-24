import { useFocusTrap } from '@presentation/hooks/use-focus-trap';

interface DeleteConfirmModalProps {
  readonly targetName: string;
  readonly isDeleting: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function DeleteConfirmModal({
  targetName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): JSX.Element {
  const trapRef = useFocusTrap({
    active: true,
    onEscape: isDeleting ? undefined : onCancel,
  });

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div ref={trapRef} className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon danger" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 id="delete-modal-title" className="modal-title">알림 삭제</h2>
        </div>
        <p className="modal-body">
          &quot;{targetName}&quot; 알림을 삭제하시겠습니까?
          <br />
          삭제 후에는 복구할 수 없습니다.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                삭제 중...
              </>
            ) : (
              '삭제'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
