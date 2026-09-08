/**
 * 스마트 출발 화면에서 "설정 추가"를 권해도 되는지 정한다.
 *
 * 목록이 비는 이유는 둘이다: 정말 없거나, 못 불러왔거나. 후자에 추가 버튼을
 * 띄우면 이미 설정해 둔 사용자를 **실패가 예정된 폼**으로 밀어 넣는다 —
 * 서버는 사용자·유형당 하나만 허용해서 409로 거절한다
 * (`manage-smart-departure.use-case.ts:55` `이미 출근 설정이 존재합니다.`).
 *
 * 조회가 실패하면 `useSmartDeparture`는 `settings`를 빈 배열로 남긴다. 경로만
 * 성공하는 흔한 경우에 `routes.length > 0`이 참이라, 에러 배너 바로 아래에
 * 추가 카드가 같이 떴다. 장소 화면은 같은 함정을 이미 막아 뒀다
 * (`app/places.tsx` `canAddMore = !error && ...`) — 같은 계약으로 맞춘다.
 */
export function canAddSetting(params: {
  /** 설정·경로 조회 중 하나라도 실패했을 때의 문구. 성공이면 null. */
  loadError: string | null;
  hasSettings: boolean;
  hasRoutes: boolean;
}): boolean {
  const { loadError, hasSettings, hasRoutes } = params;

  // 무엇이 등록돼 있는지 모르는 상태에서는 권하지 않는다.
  if (loadError) return false;

  return hasSettings || hasRoutes;
}
