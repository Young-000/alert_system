import type { ReactNode } from 'react';
import { useFocusTrap } from '@presentation/hooks/use-focus-trap';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  children,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps): JSX.Element | null {
  const trapRef = useFocusTrap({
    active: open,
    onEscape: isLoading ? undefined : onCancel,
  });

  if (!open) return null;

  return (
    <div
      className="confirm-modal-overlay"
      onClick={isLoading ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        ref={trapRef}
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="confirm-modal-title">
          {title}
        </h2>
        <div className="confirm-modal-body">{children}</div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                처리 중...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 요약 행을 위한 하위 컴포넌트
interface SummaryRowProps {
  label: string;
  value: string | ReactNode;
}

export function ConfirmSummaryRow({ label, value }: SummaryRowProps): JSX.Element {
  return (
    <div className="confirm-summary-row">
      <span className="confirm-summary-label">{label}</span>
      <strong className="confirm-summary-value">{value}</strong>
    </div>
  );
}
