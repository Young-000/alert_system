import { useEffect, useState, useCallback, useMemo } from 'react';
import { cn } from '../utils/cn';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICON_STYLES = {
  success: 'bg-success-light text-success',
  error: 'bg-error-light text-error',
  info: 'bg-[#eff6ff] text-[#2563eb]',
  warning: 'bg-warning-light text-warning',
} as const;

const PROGRESS_STYLES = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-[#2563eb]',
} as const;

const ICONS = {
  success: '\u2713',
  error: '\u2715',
  info: '\u2139',
  warning: '\u26A0',
} as const;

function Toast({ toast, onDismiss }: ToastProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5',
        'bg-bg-card border border-border rounded-lg shadow-lg',
        'animate-toast-slide relative overflow-hidden'
      )}
      role="alert"
      aria-live="polite"
    >
      <span
        className={cn(
          'w-6 h-6 rounded-full grid place-items-center',
          'text-[0.8rem] font-bold shrink-0',
          ICON_STYLES[toast.type]
        )}
        aria-hidden="true"
      >
        {ICONS[toast.type]}
      </span>
      <span className="flex-1 text-sm text-ink">{toast.message}</span>
      <button
        type="button"
        className={cn(
          'w-11 h-11 grid place-items-center',
          'bg-transparent rounded-sm cursor-pointer',
          'text-[1.2rem] text-ink-muted shrink-0',
          'transition-all duration-200',
          'hover:bg-bg-subtle hover:text-ink'
        )}
        onClick={() => onDismiss(toast.id)}
        aria-label="닫기"
      >
        ×
      </button>
      {/* Progress bar (replaces ::after pseudo-element) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-[3px] w-full',
          'animate-toast-progress',
          PROGRESS_STYLES[toast.type]
        )}
      />
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps): JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6',
        'flex flex-col gap-2.5',
        'z-[1003] max-w-[360px]',
        'max-sm:left-4 max-sm:right-4 max-sm:bottom-4 max-sm:max-w-none'
      )}
      aria-label="알림 메시지"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Toast hook for easy usage
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const helpers = useMemo(() => ({
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    info: (message: string) => addToast('info', message),
    warning: (message: string) => addToast('warning', message),
  }), [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    ...helpers,
  };
}
