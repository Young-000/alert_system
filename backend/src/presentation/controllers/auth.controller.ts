import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateUserDto, LoginDto } from '@application/dto/create-user.dto';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { LoginUseCase } from '@application/use-cases/login.use-case';
import { AuthService, AuthResponse } from '@infrastructure/auth/auth.service';
import { Public } from '@infrastructure/auth/public.decorator';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private loginUseCase: LoginUseCase,
    private authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.createUserUseCase.execute(dto);
    return this.authService.generateToken(user);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 로그인은 1분에 5회로 제한 (브루트포스 방지)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    const user = await this.loginUseCase.execute(dto);
    return this.authService.generateToken(user);
  }
}
