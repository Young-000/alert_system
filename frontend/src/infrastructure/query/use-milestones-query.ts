import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type MilestonesResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useMilestonesQuery(userId: string) {
  return useQuery<MilestonesResponse>({
    queryKey: queryKeys.streak.milestones(userId),
    queryFn: () => getCommuteApiClient().getMilestones(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
