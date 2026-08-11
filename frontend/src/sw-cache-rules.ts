/**
 * 서비스워커 런타임 캐시 대상 판별.
 *
 * 백엔드에는 전역 prefix가 없다 — `@Controller('weather')`가 그대로 `/weather/current`가
 * 되고, 프론트도 그 경로로 부른다. 여기에 `/api`를 붙여두면 어떤 요청과도 매칭되지 않아
 * 캐시 규칙이 통째로 죽는다 (등록만 되고 한 번도 동작하지 않는다).
 *
 * 실시간성이 있는 도착 정보(`/subway/arrival`, `/bus/arrival`)는 넣지 않는다 —
 * 지난 도착 시각을 최신인 양 돌려주면 사용자가 버스를 놓친다.
 */
export const CACHEABLE_API_PATH_PREFIXES = [
  '/weather/',
  '/air-quality/',
  '/subway/stations',
  '/bus/stops',
] as const;

export function isCacheableApiPath(pathname: string): boolean {
  return CACHEABLE_API_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
