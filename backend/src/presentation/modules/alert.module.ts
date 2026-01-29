import { Module } from '@nestjs/common';
import { AlertController } from '../controllers/alert.controller';
import { CreateAlertUseCase } from '@application/use-cases/create-alert.use-case';
import { DeleteAlertUseCase } from '@application/use-cases/delete-alert.use-case';
import { UpdateAlertUseCase } from '@application/use-cases/update-alert.use-case';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { SchedulerModule } from '@infrastructure/scheduler/scheduler.module';

@Module({
  imports: [SchedulerModule.forRoot()],
  controllers: [AlertController],
  providers: [
    {
      provide: 'IAlertRepository',
      useClass: PostgresAlertRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
    CreateAlertUseCase,
    DeleteAlertUseCase,
    UpdateAlertUseCase,
  ],
})
export class AlertModule {}
