export interface PlaceResponseDto {
  id: string;
  userId: string;
  placeType: string;
  label: string;
  latitude: number;
  longitude: number;
  address?: string;
  radiusM: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
