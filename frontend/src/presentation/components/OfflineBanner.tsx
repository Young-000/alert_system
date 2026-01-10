import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="offline-banner"
      role="alert"
      aria-live="assertive"
    >
      <span aria-hidden="true">📡</span>
      <span>인터넷 연결이 끊어졌습니다. 연결을 확인해주세요.</span>
    </div>
  );
}
