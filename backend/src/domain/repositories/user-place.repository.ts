import { UserPlace } from '@domain/entities/user-place.entity';
import type { PlaceType } from '@domain/entities/user-place.entity';

export interface IUserPlaceRepository {
  save(place: UserPlace): Promise<UserPlace>;
  findById(id: string): Promise<UserPlace | undefined>;
  findByIds(ids: string[]): Promise<UserPlace[]>;
  findByUserId(userId: string): Promise<UserPlace[]>;
  findByUserIdAndType(userId: string, placeType: PlaceType): Promise<UserPlace | undefined>;
  update(place: UserPlace): Promise<void>;
  delete(id: string): Promise<void>;
}

export const USER_PLACE_REPOSITORY = Symbol('IUserPlaceRepository');
