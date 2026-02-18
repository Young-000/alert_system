import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlaceEntity } from '../typeorm/user-place.entity';
import { IUserPlaceRepository } from '@domain/repositories/user-place.repository';
import { UserPlace } from '@domain/entities/user-place.entity';
import type { PlaceType } from '@domain/entities/user-place.entity';

@Injectable()
export class UserPlaceRepositoryImpl implements IUserPlaceRepository {
  constructor(
    @InjectRepository(UserPlaceEntity)
    private readonly placeRepository: Repository<UserPlaceEntity>,
  ) {}

  async save(place: UserPlace): Promise<UserPlace> {
    const entity = this.toEntity(place);
    const saved = await this.placeRepository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<UserPlace | undefined> {
    const entity = await this.placeRepository.findOne({
      where: { id },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string): Promise<UserPlace[]> {
    const entities = await this.placeRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserIdAndType(userId: string, placeType: PlaceType): Promise<UserPlace | undefined> {
    const entity = await this.placeRepository.findOne({
      where: { userId, placeType },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async update(place: UserPlace): Promise<void> {
    const entity = this.toEntity(place);
    await this.placeRepository.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.placeRepository.delete(id);
  }

  private toEntity(place: UserPlace): UserPlaceEntity {
    const entity = new UserPlaceEntity();
    if (place.id) entity.id = place.id;
    entity.userId = place.userId;
    entity.placeType = place.placeType;
    entity.label = place.label;
    entity.latitude = place.latitude;
    entity.longitude = place.longitude;
    entity.address = place.address;
    entity.radiusM = place.radiusM;
    entity.isActive = place.isActive;
    return entity;
  }

  private toDomain(entity: UserPlaceEntity): UserPlace {
    return new UserPlace(
      entity.userId,
      entity.placeType as PlaceType,
      entity.label,
      entity.latitude,
      entity.longitude,
      {
        id: entity.id,
        address: entity.address,
        radiusM: entity.radiusM,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      }
    );
  }
}
