import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  missionApiClient,
  type Mission,
  type DailyStatus,
  type MissionScore,
  type WeeklyStats,
  type MonthlyStats,
  type CreateMissionDto,
  type UpdateMissionDto,
  type DailyMissionRecord,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useMissionsQuery() {
  return useQuery<Mission[]>({
    queryKey: queryKeys.missions.all,
    queryFn: () => missionApiClient.getMissions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyStatusQuery() {
  return useQuery<DailyStatus>({
    queryKey: queryKeys.missions.daily,
    queryFn: () => missionApiClient.getDailyStatus(),
    staleTime: 30 * 1000,
  });
}

export function useDailyScoreQuery() {
  return useQuery<MissionScore | null>({
    queryKey: queryKeys.missions.dailyScore,
    queryFn: () => missionApiClient.getDailyScore(),
    staleTime: 30 * 1000,
  });
}

export function useWeeklyStatsQuery() {
  return useQuery<WeeklyStats>({
    queryKey: queryKeys.missions.weeklyStats,
    queryFn: () => missionApiClient.getWeeklyStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyStatsQuery() {
  return useQuery<MonthlyStats>({
    queryKey: queryKeys.missions.monthlyStats,
    queryFn: () => missionApiClient.getMonthlyStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMissionStreakQuery() {
  return useQuery<{ streakDay: number }>({
    queryKey: queryKeys.missions.streak,
    queryFn: () => missionApiClient.getStreak(),
    staleTime: 60 * 1000,
  });
}

export function useCreateMissionMutation() {
  const qc = useQueryClient();

  return useMutation<Mission, Error, CreateMissionDto>({
    mutationFn: (dto: CreateMissionDto) => missionApiClient.createMission(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useUpdateMissionMutation() {
  const qc = useQueryClient();

  return useMutation<Mission, Error, { id: string; dto: UpdateMissionDto }>({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMissionDto }) =>
      missionApiClient.updateMission(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
    },
  });
}

export function useDeleteMissionMutation() {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => missionApiClient.deleteMission(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useReorderMissionMutation() {
  const qc = useQueryClient();

  return useMutation<Mission, Error, { id: string; sortOrder: number }>({
    mutationFn: ({ id, sortOrder }: { id: string; sortOrder: number }) =>
      missionApiClient.reorder(id, sortOrder),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
    },
  });
}

export function useToggleActiveMutation() {
  const qc = useQueryClient();

  return useMutation<Mission, Error, string>({
    mutationFn: (id: string) => missionApiClient.toggleActive(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
    },
  });
}

export function useToggleCheckMutation() {
  const qc = useQueryClient();

  return useMutation<DailyMissionRecord, Error, string>({
    mutationFn: (missionId: string) => missionApiClient.toggleCheck(missionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.missions.daily });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.dailyScore });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.weeklyStats });
      void qc.invalidateQueries({ queryKey: queryKeys.missions.streak });
    },
  });
}
