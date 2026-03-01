import { useQuery } from '@tanstack/react-query';
import {
  behaviorApiClient,
  type PredictionResponse,
  type InsightsResponse,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function usePredictionQuery(userId: string, enabled = true) {
  return useQuery<PredictionResponse>({
    queryKey: queryKeys.behavior.prediction(userId),
    queryFn: () => behaviorApiClient.getPrediction(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePatternInsightsQuery(userId: string, enabled = true) {
  return useQuery<InsightsResponse>({
    queryKey: queryKeys.behavior.insights(userId),
    queryFn: () => behaviorApiClient.getInsights(userId),
    enabled: enabled && !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
