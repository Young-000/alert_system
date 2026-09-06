/**
 * 스마트 출발 카드가 어떤 상태를 그릴지 정한다.
 *
 * 목록이 비는 이유는 둘이다 — 정말 설정이 없거나, 못 불러왔거나.
 * 후자에 "스마트 출발 설정이 없어요 / 설정하기"를 띄우면 이미 설정한 사용자가
 * 다시 만들게 되고, 서버는 409(`이미 출근 설정이 존재합니다.`)로 거절한다
 * (`manage-smart-departure.use-case.ts`). 같은 화면의 도전 카드가 이미 같은
 * 계약을 쓴다 (`ChallengeCard` — error면 EmptyState 대신 ErrorState).
 */
export type DepartureCardState = 'loading' | 'error' | 'empty' | 'ready';

export function resolveDepartureCardState(params: {
  error: string | null;
  isLoading: boolean;
  /** 오늘 스냅샷(출근·퇴근 중 하나라도)이 손에 있는지. */
  hasSetting: boolean;
}): DepartureCardState {
  const { error, isLoading, hasSetting } = params;

  // 직전에 받아 둔 설정이 있으면 재조회가 실패해도 그것을 계속 보여준다.
  if (hasSetting) return 'ready';
  if (isLoading) return 'loading';
  if (error) return 'error';
  return 'empty';
}
