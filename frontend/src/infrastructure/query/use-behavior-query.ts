import { useQuery } from '@tanstack/react-query';
import {
  behaviorApiClient,
  type PredictionResponse,
  type InsightsResponse,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

/**
 * 엔진이 주입되지 않은 환경에서는 컨트롤러가 200 + `{ error }`를 준다
 * (`behavior.controller.ts:271,299`). 클라이언트가 그것을 null로 바꾸므로
 * 소비처는 `!data`로 갈라야 한다 — 두 화면 모두 이미 그 분기를 갖고 있다
 * (`PatternInsightsCard.tsx:171`, `PatternAnalysisPage.tsx:360`).
 */
export function usePredictionQuery(userId: string, enabled = true) {
  return useQuery<PredictionResponse | null>({
    queryKey: queryKeys.behavior.prediction(userId),
    queryFn: () => behaviorApiClient.getPrediction(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePatternInsightsQuery(userId: string, enabled = true) {
  return useQuery<InsightsResponse | null>({
    queryKey: queryKeys.behavior.insights(userId),
    queryFn: () => behaviorApiClient.getInsights(userId),
    enabled: enabled && !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
