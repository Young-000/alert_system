import { Controller, Post, Body, Get, Param, Inject } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { IUserRepository } from '@domain/repositories/user.repository';

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
}

