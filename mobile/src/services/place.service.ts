import { apiClient } from './api-client';

import type { CreatePlaceDto, Place, UpdatePlaceDto } from '@/types/place';

export const placeService = {
  async fetchPlaces(): Promise<Place[]> {
    return apiClient.get<Place[]>('/places');
  },

  async createPlace(dto: CreatePlaceDto): Promise<Place> {
    return apiClient.post<Place, CreatePlaceDto>('/places', dto);
  },

  async updatePlace(id: string, dto: UpdatePlaceDto): Promise<Place> {
    return apiClient.put<Place, UpdatePlaceDto>(`/places/${id}`, dto);
  },

  async deletePlace(id: string): Promise<void> {
    await apiClient.delete(`/places/${id}`);
  },

  async togglePlace(id: string): Promise<Place> {
    return apiClient.patch<Place>(`/places/${id}/toggle`, {});
  },
};
