/**
 * 쿼리스트링 정수 파라미터 파싱.
 *
 * `parseInt(raw, 10) || fallback` 관용구는 상한만 막고 하한을 놓친다.
 * limit/offset은 그대로 TypeORM의 take/skip이 되고, TypeORM은 음수를 검증 없이
 * `LIMIT -1` / `OFFSET -1`로 실어 보낸다. Postgres는 이를 거부해 500이 되고
 * (테스트용 SQLite는 `LIMIT -1`을 "제한 없음"으로 해석해 전량을 돌려준다).
 * 그래서 파싱과 범위 보정을 한곳에서 같이 한다.
 */
/** offset 상한. 이보다 깊은 페이지는 어떤 목록에도 존재하지 않는다. */
export const MAX_OFFSET = 100_000;

export function parseBoundedInt(
  raw: string | undefined,
  options: { fallback: number; min: number; max: number },
): number {
  const { fallback, min, max } = options;

  if (raw === undefined || raw === null || raw === '') return fallback;

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;

  return Math.min(Math.max(parsed, min), max);
}
