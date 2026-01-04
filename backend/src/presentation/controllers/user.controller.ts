import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { GetUserUseCase } from '@application/use-cases/get-user.use-case';
import { UpdateUserLocationUseCase } from '@application/use-cases/update-user-location.use-case';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateUserLocationDto } from '@application/dto/update-user-location.dto';
import { User } from '@domain/entities/user.entity';

@Controller('users')
export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserUseCase: GetUserUseCase,
    private updateUserLocationUseCase: UpdateUserLocationUseCase,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.createUserUseCase.execute(createUserDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.getUserUseCase.execute(id);
  }

  @Patch(':id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() body: UpdateUserLocationDto,
  ): Promise<User> {
    return this.updateUserLocationUseCase.execute(id, body.location);
  }
}
