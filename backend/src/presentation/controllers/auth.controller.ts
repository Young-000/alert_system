import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { IAuthService, RegisterDto, LoginDto } from '@infrastructure/auth/auth.service';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { IUserRepository } from '@domain/repositories/user.repository';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('IAuthService') private authService: IAuthService,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      if (!dto.email || !dto.password || !dto.name) {
        throw new HttpException(
          'Email, password, and name are required',
          HttpStatus.BAD_REQUEST
        );
      }

      if (dto.password.length < 6) {
        throw new HttpException(
          'Password must be at least 6 characters',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.authService.register(dto);
      return result;
    } catch (error: any) {
      if (error.message === 'User already exists') {
        throw new HttpException('User already exists', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    try {
      if (!dto.email || !dto.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.authService.login(dto);
      return result;
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.userRepository.findById(req.user.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      location: user.location,
    };
  }
}
