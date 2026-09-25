import type { CommuteMode } from '@/hooks/useCommuteMode';
import type { RouteResponse, TimeContext } from '@/types/home';

/** `getActiveRoute`가 받는 경로 선택 방식. `auto`는 시각으로 판정한다. */
export type RouteForceType = 'auto' | 'morning' | 'evening';

/**
 * 홈의 모드 배지(`ModeBadge`) 선택을 경로 선택 방식으로 옮긴다.
 *
 * 배지는 탭하면 출근↔퇴근이 바뀌는 **사용자 컨트롤**이다. 이 값을
 * `getActiveRoute`까지 전달하지 않으면 배지와 인사말만 바뀌고 그 아래 경로·도착
 * 정보는 시각으로 정한 경로에 머문다 — 오전에 "퇴근 모드"를 눌러도 출근 경로의
 * 버스 도착 시각이 계속 보인다.
 *
 * 매핑은 웹이 정본이다(`frontend/.../HomePage.tsx`의 모드 동기화 useEffect).
 * 야간은 강제하지 않고 시각 판정에 맡긴다 — 웹과 같다.
 */
export function routeTypeForMode(mode: CommuteMode): RouteForceType {
  if (mode === 'commute') return 'morning';
  if (mode === 'return') return 'evening';
  return 'auto';
}

/**
 * Determines the commute context based on current hour.
 * morning: 06:00~11:59, evening: 12:00~17:59, tomorrow: 18:00~05:59
 */
export function getTimeContext(hour?: number): TimeContext {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'evening';
  return 'tomorrow';
}

/**
 * Selects the active route based on time and preference.
 * Before 14:00 → prefer morning routes. After 14:00 → prefer evening routes.
 */
export function getActiveRoute(
  routes: RouteResponse[],
  forceType?: RouteForceType,
): RouteResponse | null {
  if (routes.length === 0) return null;

  const hour = new Date().getHours();
  const isMorning = forceType === 'auto' || !forceType
    ? hour < 14
    : forceType === 'morning';

  const targetType = isMorning ? 'morning' : 'evening';

  // 1. Preferred route matching time context
  const preferred = routes.find(
    (r) => r.isPreferred && r.routeType === targetType,
  );
  if (preferred) return preferred;

  // 2. Any route matching time context
  const timeMatch = routes.find((r) => r.routeType === targetType);
  if (timeMatch) return timeMatch;

  // 3. First available route
  return routes[0] ?? null;
}

/**
 * Builds a route summary string from checkpoints.
 * 3 or fewer: "A -> B -> C"
 * 4 or more: "A -> (N곳 경유) -> Z"
 */
export function buildRouteSummary(
  checkpoints: { name: string }[],
): string {
  if (checkpoints.length === 0) return '';
  if (checkpoints.length <= 3) {
    return checkpoints.map((cp) => cp.name).join(' -> ');
  }
  const first = checkpoints[0];
  const last = checkpoints[checkpoints.length - 1];
  if (!first || !last) return '';
  const midCount = checkpoints.length - 2;
  return `${first.name} -> (${midCount}곳 경유) -> ${last.name}`;
}
