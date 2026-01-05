import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateUserDto, LoginDto } from '@application/dto/create-user.dto';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { LoginUseCase } from '@application/use-cases/login.use-case';
import { AuthService, AuthResponse } from '@infrastructure/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private loginUseCase: LoginUseCase,
    private authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.createUserUseCase.execute(dto);
    return this.authService.generateToken(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    const user = await this.loginUseCase.execute(dto);
    return this.authService.generateToken(user);
  }
}
