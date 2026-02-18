import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  IUserPlaceRepository,
  USER_PLACE_REPOSITORY,
} from '@domain/repositories/user-place.repository';
import { UserPlace } from '@domain/entities/user-place.entity';
import type { PlaceType } from '@domain/entities/user-place.entity';
import { CreatePlaceDto } from '@application/dto/create-place.dto';
import { UpdatePlaceDto } from '@application/dto/update-place.dto';
import type { PlaceResponseDto } from '@application/dto/place-response.dto';

@Injectable()
export class ManagePlacesUseCase {
  constructor(
    @Inject(USER_PLACE_REPOSITORY)
    private readonly placeRepository: IUserPlaceRepository,
  ) {}

  async createPlace(userId: string, dto: CreatePlaceDto): Promise<PlaceResponseDto> {
    // Check if user already has this place type
    const existing = await this.placeRepository.findByUserIdAndType(userId, dto.placeType);
    if (existing) {
      throw new ConflictException(
        `이미 등록된 ${dto.placeType === 'home' ? '집' : '회사'} 장소가 있습니다.`
      );
    }

    const place = UserPlace.create(
      userId,
      dto.placeType,
      dto.label,
      dto.latitude,
      dto.longitude,
      {
        address: dto.address,
        radiusM: dto.radiusM,
      }
    );

    if (!place.isValidCoordinates()) {
      throw new BadRequestException('유효하지 않은 좌표입니다.');
    }

    if (!place.isValidRadius()) {
      throw new BadRequestException('반경은 100m~500m 범위여야 합니다.');
    }

    const saved = await this.placeRepository.save(place);
    return this.toResponseDto(saved);
  }

  async getPlacesByUserId(userId: string): Promise<PlaceResponseDto[]> {
    const places = await this.placeRepository.findByUserId(userId);
    return places.map((p) => this.toResponseDto(p));
  }

  async getPlaceById(id: string, userId: string): Promise<PlaceResponseDto> {
    const place = await this.placeRepository.findById(id);
    if (!place) {
      throw new NotFoundException(`장소를 찾을 수 없습니다. (ID: ${id})`);
    }
    if (place.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 장소에 접근할 수 없습니다.');
    }
    return this.toResponseDto(place);
  }

  async updatePlace(id: string, userId: string, dto: UpdatePlaceDto): Promise<PlaceResponseDto> {
    const place = await this.placeRepository.findById(id);
    if (!place) {
      throw new NotFoundException(`장소를 찾을 수 없습니다. (ID: ${id})`);
    }
    if (place.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 장소를 수정할 수 없습니다.');
    }

    const updated = place.withUpdatedFields({
      label: dto.label,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
      radiusM: dto.radiusM,
    });

    if (!updated.isValidCoordinates()) {
      throw new BadRequestException('유효하지 않은 좌표입니다.');
    }

    if (!updated.isValidRadius()) {
      throw new BadRequestException('반경은 100m~500m 범위여야 합니다.');
    }

    await this.placeRepository.update(updated);
    const reloaded = await this.placeRepository.findById(id);
    return this.toResponseDto(reloaded!);
  }

  async deletePlace(id: string, userId: string): Promise<void> {
    const place = await this.placeRepository.findById(id);
    if (!place) {
      throw new NotFoundException(`장소를 찾을 수 없습니다. (ID: ${id})`);
    }
    if (place.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 장소를 삭제할 수 없습니다.');
    }
    await this.placeRepository.delete(id);
  }

  async togglePlace(id: string, userId: string): Promise<PlaceResponseDto> {
    const place = await this.placeRepository.findById(id);
    if (!place) {
      throw new NotFoundException(`장소를 찾을 수 없습니다. (ID: ${id})`);
    }
    if (place.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 장소를 변경할 수 없습니다.');
    }

    const toggled = place.toggleActive();
    await this.placeRepository.update(toggled);
    const reloaded = await this.placeRepository.findById(id);
    return this.toResponseDto(reloaded!);
  }

  // Internal method: used by commute-event processing
  async findPlaceById(id: string): Promise<UserPlace | undefined> {
    return this.placeRepository.findById(id);
  }

  private toResponseDto(place: UserPlace): PlaceResponseDto {
    return {
      id: place.id,
      userId: place.userId,
      placeType: place.placeType,
      label: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      radiusM: place.radiusM,
      isActive: place.isActive,
      createdAt: place.createdAt.toISOString(),
      updatedAt: place.updatedAt.toISOString(),
    };
  }
}
