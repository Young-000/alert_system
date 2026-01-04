import { Inject } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const user = new User(dto.email, dto.name, dto.location);
    await this.userRepository.save(user);
    return user;
  }
}
