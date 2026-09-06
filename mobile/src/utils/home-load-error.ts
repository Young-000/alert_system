/**
 * 홈 화면의 코어 데이터(경로·알림·기록) 조회 실패를 한 줄 문구로 옮긴다.
 *
 * 세 조회는 `Promise.allSettled`로 함께 나가고, 실패해도 각자의 기존 값을 유지한다.
 * 유지만 하고 끝내면 **실패가 빈 데이터로 위장된다** — 알림 조회가 실패하면
 * `nextAlert`가 null이 되어 다음 알림 카드가 통째로 사라지고, 알림을 걸어둔
 * 사용자는 알림이 없어졌다고 읽는다. 기록이 실패하면 브리핑의 "약 N분 예상"이
 * 조용히 빠진다.
 *
 * 예전에는 **셋 다** 실패했을 때와 경로가 실패했을 때만 알렸다. 알림·기록만
 * 실패하는 흔한 경우가 무음으로 지나갔다. 웹은 같은 화면에서 셋 중 하나만
 * 실패해도 알린다(`frontend/.../use-home-data.ts:118` — 세 쿼리의 error를
 * 함께 본다). 같은 계약으로 맞춘다.
 *
 * 웹은 어느 쪽이 실패하든 같은 문구를 쓰지만, 여기서는 무엇을 못 불러왔는지
 * 밝힌다 — 화면에서 사라진 카드와 문구가 이어져야 사용자가 원인을 안다.
 */

export type HomeFetchOutcome = 'ok' | 'failed';

export interface HomeFetchOutcomes {
  routes: HomeFetchOutcome;
  alerts: HomeFetchOutcome;
  stats: HomeFetchOutcome;
}

const RETRY_SUFFIX = '잠시 후 다시 시도해주세요.';

/** 실패한 조회가 없으면 null. */
export function resolveHomeLoadError(outcomes: HomeFetchOutcomes): string | null {
  const { routes, alerts, stats } = outcomes;

  if (routes === 'failed' && alerts === 'failed' && stats === 'failed') {
    return `데이터를 불러올 수 없습니다. ${RETRY_SUFFIX}`;
  }
  if (routes === 'failed') {
    return `경로 정보를 불러올 수 없습니다. ${RETRY_SUFFIX}`;
  }
  if (alerts === 'failed') {
    return `알림 정보를 불러올 수 없습니다. ${RETRY_SUFFIX}`;
  }
  if (stats === 'failed') {
    return `기록을 불러올 수 없습니다. ${RETRY_SUFFIX}`;
  }
  return null;
}
