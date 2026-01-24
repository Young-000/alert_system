import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyController } from '../controllers/privacy.controller';
import { ExportUserDataUseCase } from '../../application/use-cases/export-user-data.use-case';
import { DataRetentionService } from '../../application/services/data-retention.service';
import { BehaviorEventEntity } from '../../infrastructure/persistence/typeorm/behavior-event.entity';
import { CommuteRecordEntity } from '../../infrastructure/persistence/typeorm/commute-record.entity';
import { UserPatternEntity } from '../../infrastructure/persistence/typeorm/user-pattern.entity';
import { UserEntity } from '../../infrastructure/persistence/typeorm/user.entity';
import { AlertEntity } from '../../infrastructure/persistence/typeorm/alert.entity';
import { BehaviorEventRepositoryImpl } from '../../infrastructure/persistence/repositories/behavior-event.repository';
import { CommuteRecordRepositoryImpl } from '../../infrastructure/persistence/repositories/commute-record.repository';
import { UserPatternRepositoryImpl } from '../../infrastructure/persistence/repositories/user-pattern.repository';
import { PostgresUserRepository } from '../../infrastructure/persistence/postgres-user.repository';
import { PostgresAlertRepository } from '../../infrastructure/persistence/postgres-alert.repository';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      BehaviorEventEntity,
      CommuteRecordEntity,
      UserPatternEntity,
      UserEntity,
      AlertEntity,
    ]),
  ],
  controllers: [PrivacyController],
  providers: [
    ExportUserDataUseCase,
    DataRetentionService,
    {
      provide: 'USER_REPOSITORY',
      useClass: PostgresUserRepository,
    },
    {
      provide: 'ALERT_REPOSITORY',
      useClass: PostgresAlertRepository,
    },
    {
      provide: 'BEHAVIOR_EVENT_REPOSITORY',
      useClass: BehaviorEventRepositoryImpl,
    },
    {
      provide: 'COMMUTE_RECORD_REPOSITORY',
      useClass: CommuteRecordRepositoryImpl,
    },
    {
      provide: 'USER_PATTERN_REPOSITORY',
      useClass: UserPatternRepositoryImpl,
    },
  ],
  exports: [DataRetentionService],
})
export class PrivacyModule {}
