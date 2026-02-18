// ─── Place Types (Geofence locations) ──────────────

export type PlaceType = 'home' | 'work';

export type Place = {
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
};

export type CreatePlaceDto = {
  placeType: PlaceType;
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  radiusM?: number;
};

export type UpdatePlaceDto = {
  label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  radiusM?: number;
};
