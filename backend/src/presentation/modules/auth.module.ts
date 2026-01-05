import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '@infrastructure/auth/auth.service';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: 'IAuthService',
      useFactory: (userRepository: any, jwtModule: any) => {
        // JwtService is automatically available from JwtModule
        const { JwtService } = require('@nestjs/jwt');
        const jwtService = new JwtService({
          secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          signOptions: { expiresIn: '7d' },
        });
        return new AuthService(userRepository, jwtService);
      },
      inject: ['IUserRepository'],
    },
  ],
  exports: ['IAuthService', 'IUserRepository', JwtStrategy, PassportModule],
})
export class AuthModule {}
