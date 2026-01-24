import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { LoginUseCase } from '@application/use-cases/login.use-case';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@infrastructure/persistence/typeorm/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    CreateUserUseCase,
    LoginUseCase,
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
