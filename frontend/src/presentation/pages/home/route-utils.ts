import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { BusArrival, SubwayArrival } from '@infrastructure/api';

export interface TransitArrivalInfo {
  type: 'bus' | 'subway';
  name: string;
  arrivals: (BusArrival | SubwayArrival)[];
  isLoading: boolean;
}

export function getActiveRoute(
  routes: RouteResponse[],
  forceType?: 'auto' | 'morning' | 'evening'
): RouteResponse | null {
  const hour = new Date().getHours();
  const isMorning = forceType === 'auto' || !forceType
    ? hour < 14
    : forceType === 'morning';

  const preferred = routes.find(r =>
    r.isPreferred && (isMorning ? r.routeType === 'morning' : r.routeType === 'evening')
  );
  if (preferred) return preferred;

  const timeMatch = routes.find(r =>
    isMorning ? r.routeType === 'morning' : r.routeType === 'evening'
  );
  if (timeMatch) return timeMatch;

  return routes[0] || null;
}
