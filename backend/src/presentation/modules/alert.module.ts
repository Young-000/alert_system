import { Module } from '@nestjs/common';
import { AlertController } from '../controllers/alert.controller';
import { CreateAlertUseCase } from '@application/use-cases/create-alert.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [AlertController],
  providers: [
    {
      provide: 'IAlertRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresAlertRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    CreateAlertUseCase,
  ],
})
export class AlertModule {}

