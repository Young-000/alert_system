import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCommuteApiClient,
  type NeighborStatsResponse,
  type TipsListResponse,
  type CreateTipRequest,
  type CreateTipResponse,
  type HelpfulTipResponse,
  type ReportTipResponse,
} from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useNeighborStats(routeId: string | undefined, enabled = true) {
  return useQuery<NeighborStatsResponse>({
    queryKey: queryKeys.community.neighbors(routeId),
    queryFn: () => getCommuteApiClient().getNeighborStats(routeId),
    enabled: enabled && !!routeId,
    staleTime: 60 * 60 * 1000, // 1 hour — neighbor stats cached on server
    retry: 1,
  });
}

export function useCheckpointTips(
  checkpointKey: string | undefined,
  page = 1,
  limit = 20,
) {
  return useQuery<TipsListResponse>({
    queryKey: queryKeys.community.tips(checkpointKey ?? '', page),
    queryFn: () => getCommuteApiClient().getCheckpointTips(checkpointKey!, page, limit),
    enabled: !!checkpointKey,
    staleTime: 30 * 1000, // 30 seconds — tips can change more frequently
    retry: 1,
  });
}

export function useCreateTip() {
  const qc = useQueryClient();

  return useMutation<CreateTipResponse, Error, CreateTipRequest>({
    mutationFn: (dto: CreateTipRequest) => getCommuteApiClient().createTip(dto),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: ['community', 'tips', variables.checkpointKey],
      });
    },
  });
}

export function useMarkHelpful() {
  const qc = useQueryClient();

  return useMutation<HelpfulTipResponse, Error, string>({
    mutationFn: (tipId: string) => getCommuteApiClient().markHelpful(tipId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community', 'tips'] });
    },
  });
}

export function useReportTip() {
  const qc = useQueryClient();

  return useMutation<ReportTipResponse, Error, string>({
    mutationFn: (tipId: string) => getCommuteApiClient().reportTip(tipId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community', 'tips'] });
    },
  });
}
