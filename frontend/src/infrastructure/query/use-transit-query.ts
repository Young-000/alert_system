import { useQuery } from '@tanstack/react-query';
import { subwayApiClient, busApiClient } from '@infrastructure/api';
import type { RouteResponse } from '@infrastructure/api/commute-api.client';
import type { TransitArrivalInfo } from '@presentation/pages/home/route-utils';
import { queryKeys } from './query-keys';

/**
 * Fetches transit arrival info for a given route.
 * Extracts subway stations and bus stops from route checkpoints,
 * then queries arrival APIs in parallel.
 */
export async function fetchTransitArrivals(
  route: RouteResponse,
): Promise<TransitArrivalInfo[]> {
  const subwayStations = new Set<string>();
  const busStopIds = new Set<string>();

  for (const cp of route.checkpoints) {
    if (cp.transportMode === 'subway' && cp.name) {
      const stationName = cp.name.replace(/역$/, '').replace(/\s*\d+호선.*$/, '');
      subwayStations.add(stationName);
    }
    if (cp.transportMode === 'bus' && cp.linkedBusStopId) {
      busStopIds.add(cp.linkedBusStopId);
    }
  }

  const stationNames = Array.from(subwayStations).slice(0, 2);
  const stopIds = Array.from(busStopIds).slice(0, 2);

  const infos: TransitArrivalInfo[] = [];

  // Fetch subway arrivals
  const subwayPromises = stationNames.map(async (name): Promise<TransitArrivalInfo> => {
    try {
      const arrivals = await subwayApiClient.getArrival(name);
      return { type: 'subway', name: `${name}역`, arrivals: arrivals.slice(0, 3), isLoading: false };
    } catch {
      return { type: 'subway', name: `${name}역`, arrivals: [], isLoading: false, error: '조회 실패' };
    }
  });

  // Fetch bus arrivals
  const busPromises = stopIds.map(async (id): Promise<TransitArrivalInfo> => {
    try {
      const arrivals = await busApiClient.getArrival(id);
      return { type: 'bus', name: `정류장 ${id}`, arrivals: arrivals.slice(0, 3), isLoading: false };
    } catch {
      return { type: 'bus', name: `정류장 ${id}`, arrivals: [], isLoading: false, error: '조회 실패' };
    }
  });

  const results = await Promise.all([...subwayPromises, ...busPromises]);
  infos.push(...results);

  return infos;
}

const TRANSIT_STALE_TIME = 15 * 1000; // 15 seconds
const TRANSIT_REFETCH_INTERVAL = 30 * 1000; // 30 seconds

export function useTransitQuery(activeRoute: RouteResponse | null) {
  return useQuery<TransitArrivalInfo[]>({
    queryKey: queryKeys.transit.byRoute(activeRoute?.id ?? ''),
    queryFn: () => fetchTransitArrivals(activeRoute!),
    enabled: !!activeRoute,
    staleTime: TRANSIT_STALE_TIME,
    refetchInterval: TRANSIT_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
