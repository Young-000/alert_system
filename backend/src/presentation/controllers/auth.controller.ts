import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Res, Logger, Optional, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto, LoginDto } from '@application/dto/create-user.dto';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { LoginUseCase } from '@application/use-cases/login.use-case';
import { GoogleOAuthUseCase } from '@application/use-cases/google-oauth.use-case';
import { AuthService, AuthResponse } from '@infrastructure/auth/auth.service';
import { GoogleProfile } from '@infrastructure/auth/google.strategy';
import { Public } from '@infrastructure/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly isGoogleEnabled: boolean;
  private readonly frontendUrl: string;

  constructor(
    private createUserUseCase: CreateUserUseCase,
    private loginUseCase: LoginUseCase,
    private authService: AuthService,
    private configService: ConfigService,
    @Optional() @Inject('GoogleOAuthUseCase') private googleOAuthUseCase?: GoogleOAuthUseCase,
  ) {
    this.isGoogleEnabled = !!(
      this.configService.get<string>('GOOGLE_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (this.isGoogleEnabled) {
      this.logger.log('Google OAuth is enabled');
    } else {
      this.logger.warn('Google OAuth is disabled (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
    }
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
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

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Guard가 Google OAuth 페이지로 리다이렉트
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      if (!this.googleOAuthUseCase) {
        this.logger.error('Google OAuth is not configured');
        return res.redirect(`${this.frontendUrl}/login?error=google_not_configured`);
      }

      const googleProfile = req.user as GoogleProfile;
      const user = await this.googleOAuthUseCase.execute(googleProfile);
      const authResponse = this.authService.generateToken(user);

      // 프론트엔드로 토큰과 함께 리다이렉트
      const params = new URLSearchParams({
        token: authResponse.accessToken,
        userId: authResponse.user.id,
        email: authResponse.user.email,
        name: authResponse.user.name,
      });

      return res.redirect(`${this.frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      this.logger.error(`Google OAuth callback error: ${error}`);
      return res.redirect(`${this.frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Public()
  @Get('google/status')
  googleStatus() {
    return {
      enabled: this.isGoogleEnabled,
      message: this.isGoogleEnabled
        ? 'Google OAuth is configured'
        : 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    };
  }
}
