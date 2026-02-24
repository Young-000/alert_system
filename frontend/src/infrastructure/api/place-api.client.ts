import type { ApiClient } from './api-client';

// ─── Types ───────────────────────────────────────────

export type PlaceType = 'home' | 'work';

export interface Place {
  id: string;
  userId: string;
  placeType: PlaceType;
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  radiusM: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaceDto {
  placeType: PlaceType;
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  radiusM?: number;
}

export interface UpdatePlaceDto {
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  radiusM?: number;
}

// ─── API Client ──────────────────────────────────────

export class PlaceApiClient {
  constructor(private apiClient: ApiClient) {}

  async getPlaces(): Promise<Place[]> {
    return this.apiClient.get<Place[]>('/places');
  }

  async createPlace(dto: CreatePlaceDto): Promise<Place> {
    return this.apiClient.post<Place>('/places', dto);
  }

  async updatePlace(id: string, dto: UpdatePlaceDto): Promise<Place> {
    return this.apiClient.put<Place>(`/places/${id}`, dto);
  }

  async deletePlace(id: string): Promise<void> {
    return this.apiClient.delete(`/places/${id}`);
  }

  async togglePlace(id: string): Promise<Place> {
    return this.apiClient.patch<Place>(`/places/${id}/toggle`);
  }
}
