import { useQuery } from '@tanstack/react-query';
import {
  getCommuteApiClient,
  type InsightSortBy,
  type RegionsListResponse,
  type RegionDetail,
  type RegionTrend,
  type PeakHoursData,
  type MyComparison,
} from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useRegions(sortBy?: InsightSortBy) {
  return useQuery<RegionsListResponse>({
    queryKey: queryKeys.insights.regions(sortBy),
    queryFn: () => getCommuteApiClient().getRegions(sortBy),
    staleTime: 10 * 60 * 1000, // 10 minutes — aggregates don't change often
    retry: 1,
  });
}

export function useRegionDetail(regionId: string | undefined) {
  return useQuery<RegionDetail>({
    queryKey: queryKeys.insights.regionDetail(regionId ?? ''),
    queryFn: () => getCommuteApiClient().getRegionById(regionId!),
    enabled: !!regionId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useRegionTrends(regionId: string | undefined) {
  return useQuery<RegionTrend>({
    queryKey: queryKeys.insights.regionTrends(regionId ?? ''),
    queryFn: () => getCommuteApiClient().getRegionTrends(regionId!),
    enabled: !!regionId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useRegionPeakHours(regionId: string | undefined) {
  return useQuery<PeakHoursData>({
    queryKey: queryKeys.insights.regionPeakHours(regionId ?? ''),
    queryFn: () => getCommuteApiClient().getRegionPeakHours(regionId!),
    enabled: !!regionId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useMyComparison(enabled: boolean) {
  return useQuery<MyComparison>({
    queryKey: queryKeys.insights.myComparison,
    queryFn: () => getCommuteApiClient().getMyComparison(),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
