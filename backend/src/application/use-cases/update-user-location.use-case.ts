import { Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository';
import { UserLocation } from '@domain/entities/user.entity';

export class UpdateUserLocationUseCase {
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async execute(userId: string, location: UserLocation) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    user.updateLocation(location);
    await this.userRepository.save(user);
    return user;
  }
}
