import { Inject, ConflictException } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';

export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = new User(dto.email, dto.name, passwordHash, dto.location);
    await this.userRepository.save(user);
    return user;
  }
}
