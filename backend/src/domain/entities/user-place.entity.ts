export type PlaceType = 'home' | 'work';

export class UserPlace {
  readonly id: string;
  readonly userId: string;
  readonly placeType: PlaceType;
  readonly label: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly address?: string;
  readonly radiusM: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    placeType: PlaceType,
    label: string,
    latitude: number,
    longitude: number,
    options?: {
      id?: string;
      address?: string;
      radiusM?: number;
      isActive?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.placeType = placeType;
    this.label = label;
    this.latitude = latitude;
    this.longitude = longitude;
    this.address = options?.address;
    this.radiusM = options?.radiusM ?? 200;
    this.isActive = options?.isActive ?? true;
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static create(
    userId: string,
    placeType: PlaceType,
    label: string,
    latitude: number,
    longitude: number,
    options?: { address?: string; radiusM?: number }
  ): UserPlace {
    return new UserPlace(userId, placeType, label, latitude, longitude, {
      address: options?.address,
      radiusM: options?.radiusM ?? 200,
      isActive: true,
    });
  }

  withUpdatedFields(fields: {
    label?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    radiusM?: number;
  }): UserPlace {
    return new UserPlace(
      this.userId,
      this.placeType,
      fields.label ?? this.label,
      fields.latitude ?? this.latitude,
      fields.longitude ?? this.longitude,
      {
        id: this.id,
        address: fields.address !== undefined ? fields.address : this.address,
        radiusM: fields.radiusM ?? this.radiusM,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      }
    );
  }

  toggleActive(): UserPlace {
    return new UserPlace(
      this.userId,
      this.placeType,
      this.label,
      this.latitude,
      this.longitude,
      {
        id: this.id,
        address: this.address,
        radiusM: this.radiusM,
        isActive: !this.isActive,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      }
    );
  }

  isValidRadius(): boolean {
    return this.radiusM >= 100 && this.radiusM <= 500;
  }

  isValidCoordinates(): boolean {
    return (
      this.latitude >= -90 &&
      this.latitude <= 90 &&
      this.longitude >= -180 &&
      this.longitude <= 180
    );
  }
}
