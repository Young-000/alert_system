/**
 * 목록 조회가 실패했을 때 쓰는 알림.
 *
 * 조회 실패는 data=undefined로 들어오고 isLoading은 재시도 소진 후 false가 된다.
 * 그대로 그리면 "등록된 ~가 없습니다" 빈 상태가 되어, 저장해 둔 데이터가
 * 지워진 것처럼 보인다. 빈 상태 대신 이 알림을 그려서 실패는 실패라고 말하고,
 * 그 화면에서 할 수 있는 행동(다시 시도)을 하나 남긴다.
 */
export function LoadErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="notice error" role="alert">
      <p>{message}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}
