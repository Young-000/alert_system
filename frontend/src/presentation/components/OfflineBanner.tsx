import { useOnlineStatus } from '../hooks/use-online-status';
import { cn } from '../utils/cn';

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0',
        'bg-gradient-to-r from-[#f59e0b] to-[#d97706]',
        'text-white px-4 py-3',
        'flex items-center justify-center gap-2.5',
        'text-sm font-medium',
        'z-[1002] animate-slide-down',
        'shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
      )}
      role="alert"
      aria-live="assertive"
    >
      <svg
        className="animate-icon-pulse"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>인터넷 연결이 끊어졌습니다. 연결을 확인해주세요.</span>
    </div>
  );
}
