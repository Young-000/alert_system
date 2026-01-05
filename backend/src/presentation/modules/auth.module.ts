import { Module } from '@nestjs/common';
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
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'alert-system-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
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
