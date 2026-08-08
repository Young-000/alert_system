/**
 * 경로 비교 요청 범위 — 서버 `GET /analytics/compare`의 계약과 같아야 한다.
 * 범위를 벗어난 요청은 서버가 400으로 거절하므로, 보내기 전에 여기서 맞춘다.
 */
export const MIN_COMPARE_ROUTES = 2;
export const MAX_COMPARE_ROUTES = 5;

/**
 * 비교에 보낼 경로 id를 고른다.
 *
 * 비교할 수 없으면 `null` — 호출부가 요청 자체를 건너뛰라는 뜻이다.
 */
export function selectComparableRouteIds(
  routeIds: readonly string[],
): string[] | null {
  const valid = routeIds.filter((id) => id.trim().length > 0);

  if (valid.length < MIN_COMPARE_ROUTES) return null;

  return valid.slice(0, MAX_COMPARE_ROUTES);
}
