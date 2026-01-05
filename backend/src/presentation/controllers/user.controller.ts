import { Controller, Post, Body, Get, Param, Patch, Inject } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { IUserRepository } from '@domain/repositories/user.repository';

export class UpdatePhoneNumberDto {
  phoneNumber: string;
}

@Controller('users')
export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.createUserUseCase.execute(createUserDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userRepository.findById(id);
  }

  @Patch(':id/phone')
  async updatePhoneNumber(
    @Param('id') id: string,
    @Body() dto: UpdatePhoneNumberDto
  ) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.updatePhoneNumber(dto.phoneNumber);
    await this.userRepository.save(user);

    return { success: true, phoneNumber: dto.phoneNumber };
  }
}

