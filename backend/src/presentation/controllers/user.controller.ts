import { Controller, Post, Body, Get, Param, Put, Inject } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateUserLocationUseCase, UpdateUserLocationDto } from '@application/use-cases/update-user-location.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';

@Controller('users')
export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private updateUserLocationUseCase: UpdateUserLocationUseCase,
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

  @Put(':id/location')
  async updateLocation(@Param('id') id: string, @Body() locationDto: UpdateUserLocationDto) {
    return this.updateUserLocationUseCase.execute(id, locationDto);
  }
}

