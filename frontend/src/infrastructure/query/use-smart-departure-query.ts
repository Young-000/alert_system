import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  smartDepartureApiClient,
  type SmartDepartureSetting,
  type CreateSmartDepartureDto,
  type UpdateSmartDepartureDto,
  type SmartDepartureTodayResponse,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function useSmartDepartureSettingsQuery(enabled = true) {
  return useQuery<SmartDepartureSetting[]>({
    queryKey: queryKeys.smartDeparture.settings,
    queryFn: () => smartDepartureApiClient.getSettings(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSmartDepartureTodayQuery(enabled = true) {
  return useQuery<SmartDepartureTodayResponse>({
    queryKey: queryKeys.smartDeparture.today,
    queryFn: () => smartDepartureApiClient.getToday(),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateSmartDepartureMutation() {
  const queryClient = useQueryClient();
  return useMutation<SmartDepartureSetting, Error, CreateSmartDepartureDto>({
    mutationFn: (dto) => smartDepartureApiClient.createSetting(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.smartDeparture.all });
    },
  });
}

export function useUpdateSmartDepartureMutation() {
  const queryClient = useQueryClient();
  return useMutation<SmartDepartureSetting, Error, { id: string; dto: UpdateSmartDepartureDto }>({
    mutationFn: ({ id, dto }) => smartDepartureApiClient.updateSetting(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.smartDeparture.all });
    },
  });
}

export function useDeleteSmartDepartureMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => smartDepartureApiClient.deleteSetting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.smartDeparture.all });
    },
  });
}

export function useToggleSmartDepartureMutation() {
  const queryClient = useQueryClient();
  return useMutation<SmartDepartureSetting, Error, string>({
    mutationFn: (id) => smartDepartureApiClient.toggleSetting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.smartDeparture.all });
    },
  });
}
