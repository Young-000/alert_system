import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    CreateUserUseCase,
  ],
})
export class UserModule {}

