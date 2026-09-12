/**
 * 설정 탭의 요약 섹션이 조회 실패에서 빠져나갈 길을 줘야 하는지 정한다.
 *
 * 설정 탭은 이 리포지토리에서 **회복 수단이 하나도 없는 유일한 화면이었다.**
 * 다른 화면은 전부 실패에 다음 행동이 붙어 있다 —
 * `app/places.tsx:204`·`app/(tabs)/alerts.tsx:164`·`app/(tabs)/commute.tsx:199,226`·
 * `app/(tabs)/index.tsx:159`는 `onRetry`를 걸고, 스크롤 화면 5개는 당겨서
 * 새로고침도 함께 준다. 설정 탭에는 `refreshControl`이 없고(0건) 섹션에도
 * 버튼이 없었다.
 *
 * 그래서 한 번 실패하면 **앱을 다시 켜지 않고는 되돌릴 수 없었다.**
 * `usePlaces`·`useSmartDeparture`의 조회는 `[user, fetchX]`에서 한 번만 돌고,
 * 포커스·AppState 재조회가 없다(`useHomeData`·`useGeofence`와 달리). 탭은
 * 리마운트되지 않는다.
 *
 * "전용 화면에 재시도가 있으니 괜찮다"는 정당화가 안 되는 이유: 훅 인스턴스가
 * 화면별로 따로다. `/places`에서 되살려도 설정 탭의 `usePlaces`는 낡은 채로 남는다.
 *
 * 장소 조회 실패는 표시만 망가뜨리는 게 아니다. `GeofenceSection`의
 * `canToggle`이 `activePlacesCount > 0`을 보는데, 실패하면 그 값이 0이라
 * **자동 감지 스위치가 잠긴다.** 실패 문구를 읽은 사용자가 스위치도 못 누르고
 * 되돌릴 방법도 없는 상태가 그것이었다. (스위치를 강제로 열어주는 것은 답이
 * 아니다 — 빈 목록으로 감지를 켜면 감지할 대상이 없다. 목록을 다시 받아오는
 * 것이 맞는 순서다.)
 *
 * 되부를 수단은 이미 두 훅에 `refresh`로 있었고, 설정 탭이 구조분해에서
 * 버리고 있었다(`app/(tabs)/settings.tsx:25`, `:27-32`).
 */
export function shouldOfferLoadRetry(params: {
  /** 조회 실패 사유. 성공이면 null. */
  loadError: string | null;
  isLoading: boolean;
  /**
   * 실패 문구보다 앞서는 다른 안내가 떠 있으면 true.
   *
   * `GeofenceSection`의 위치 권한 안내가 그 자리다 — `getStatusText`는 권한
   * 상태를 `placesError`보다 먼저 본다. 화면이 권한을 말하는데 버튼이 장소
   * 재조회를 하면 둘이 서로 다른 말을 한다. 문구의 우선순위와 행동의
   * 우선순위를 같게 맞춘다.
   */
  isSupersededByOtherNotice?: boolean;
}): boolean {
  const { loadError, isLoading, isSupersededByOtherNotice = false } = params;

  // 로딩 중에는 실패 문구가 아직 화면에 없다. 성공할 조회를 실패로 보이게
  // 만들지 않는다.
  if (isLoading) return false;
  if (isSupersededByOtherNotice) return false;

  return loadError !== null;
}
