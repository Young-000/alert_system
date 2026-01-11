import { Controller, Post, Body, Get, Param, Patch, Request, ForbiddenException } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { GetUserUseCase } from '@application/use-cases/get-user.use-case';
import { UpdateUserLocationUseCase } from '@application/use-cases/update-user-location.use-case';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateUserLocationDto } from '@application/dto/update-user-location.dto';
import { UserResponseDto } from '@application/dto/user-response.dto';
import { Public } from '@infrastructure/auth/public.decorator';
import { AuthenticatedRequest } from '@infrastructure/auth/auth.service';

@Controller('users')
export class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserUseCase: GetUserUseCase,
    private updateUserLocationUseCase: UpdateUserLocationUseCase,
  ) {}

  @Public() // 회원가입은 auth/register 사용 권장, 하위 호환성 유지
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createUserUseCase.execute(createUserDto);
    return UserResponseDto.fromEntity(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest): Promise<UserResponseDto> {
    // 자신의 정보만 조회 가능 (Authorization)
    if (req.user.userId !== id) {
      throw new ForbiddenException('다른 사용자의 정보를 조회할 수 없습니다.');
    }
    const user = await this.getUserUseCase.execute(id);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(':id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() body: UpdateUserLocationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    // 자신의 위치만 수정 가능 (Authorization)
    if (req.user.userId !== id) {
      throw new ForbiddenException('다른 사용자의 위치를 수정할 수 없습니다.');
    }
    const user = await this.updateUserLocationUseCase.execute(id, body.location);
    return UserResponseDto.fromEntity(user);
  }
}
