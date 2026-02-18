import type { RouteResponse, TimeContext } from '@/types/home';

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
  forceType?: 'auto' | 'morning' | 'evening',
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
