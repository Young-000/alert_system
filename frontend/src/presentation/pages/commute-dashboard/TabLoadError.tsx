/**
 * 탭 안에서 일어난 조회 실패.
 *
 * 페이지 상단의 오류 알림은 대시보드 본체(stats) 실패에만 뜬다. 탭별 조회는
 * 따로 실패하므로, 실패한 탭 안에 다시 부를 길이 없으면 그 화면은 막다른 길이 된다.
 * 되부르는 일은 `retryLoad`가 이미 하고 있다 — 여기서는 그 길을 노출만 한다.
 */
export function TabLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <p className="muted" role="alert" style={{ margin: '0 0 0.75rem' }}>
      {message}
      {onRetry && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onRetry}
          style={{ marginLeft: '0.5rem' }}
        >
          다시 시도
        </button>
      )}
    </p>
  );
}
