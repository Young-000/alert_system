import { Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User, UserLocation } from '@domain/entities/user.entity';

export interface UpdateUserLocationDto {
  address: string;
  lat: number;
  lng: number;
}

export class UpdateUserLocationUseCase {
  constructor(@Inject('IUserRepository') private userRepository: IUserRepository) {}

  async execute(userId: string, location: UpdateUserLocationDto): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userLocation: UserLocation = {
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    };

    user.updateLocation(userLocation);
    await this.userRepository.save(user);
    return user;
  }
}
