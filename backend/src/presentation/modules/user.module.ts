import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { GetUserUseCase } from '@application/use-cases/get-user.use-case';
import { UpdateUserLocationUseCase } from '@application/use-cases/update-user-location.use-case';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
    CreateUserUseCase,
    GetUserUseCase,
    UpdateUserLocationUseCase,
  ],
  exports: ['IUserRepository'],
})
export class UserModule {}
