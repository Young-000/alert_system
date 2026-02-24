import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  placeApiClient,
  type Place,
  type CreatePlaceDto,
  type UpdatePlaceDto,
} from '@infrastructure/api';
import { queryKeys } from './query-keys';

export function usePlacesQuery(enabled = true) {
  return useQuery<Place[]>({
    queryKey: queryKeys.places.all,
    queryFn: () => placeApiClient.getPlaces(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Place, Error, CreatePlaceDto>({
    mutationFn: (dto) => placeApiClient.createPlace(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}

export function useUpdatePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Place, Error, { id: string; dto: UpdatePlaceDto }>({
    mutationFn: ({ id, dto }) => placeApiClient.updatePlace(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}

export function useDeletePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => placeApiClient.deletePlace(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}

export function useTogglePlaceMutation() {
  const queryClient = useQueryClient();
  return useMutation<Place, Error, string>({
    mutationFn: (id) => placeApiClient.togglePlace(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}
