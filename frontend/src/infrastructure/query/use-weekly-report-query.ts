import { useQuery } from '@tanstack/react-query';
import { getCommuteApiClient, type WeeklyReportResponse } from '@infrastructure/api/commute-api.client';
import { queryKeys } from './query-keys';

export function useWeeklyReportQuery(userId: string, weekOffset = 0) {
  return useQuery<WeeklyReportResponse>({
    queryKey: queryKeys.weeklyReport.byUser(userId, weekOffset),
    queryFn: () => getCommuteApiClient().getWeeklyReport(userId, weekOffset),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,       // 10분 — 주간 데이터라 자주 안 바뀜
    refetchOnWindowFocus: false,      // 비용 대비 효용 낮음
  });
}
