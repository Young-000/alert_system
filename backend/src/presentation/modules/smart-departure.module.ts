import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { SmartDepartureSettingEntity } from '@infrastructure/persistence/typeorm/smart-departure-setting.entity';
import { SmartDepartureSnapshotEntity } from '@infrastructure/persistence/typeorm/smart-departure-snapshot.entity';

// Repository Implementations
import { SmartDepartureSettingRepositoryImpl } from '@infrastructure/persistence/repositories/smart-departure-setting.repository';
import { SmartDepartureSnapshotRepositoryImpl } from '@infrastructure/persistence/repositories/smart-departure-snapshot.repository';

// Repository Symbols
import { SMART_DEPARTURE_SETTING_REPOSITORY } from '@domain/repositories/smart-departure-setting.repository';
import { SMART_DEPARTURE_SNAPSHOT_REPOSITORY } from '@domain/repositories/smart-departure-snapshot.repository';

// Use Cases
import { ManageSmartDepartureUseCase } from '@application/use-cases/manage-smart-departure.use-case';
import { CalculateDepartureUseCase } from '@application/use-cases/calculate-departure.use-case';
import { ScheduleDepartureAlertsUseCase } from '@application/use-cases/schedule-departure-alerts.use-case';

// Controllers
import { SmartDepartureController } from '../controllers/smart-departure.controller';

// Import CommuteModule for route/session repository access
import { CommuteModule } from './commute.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmartDepartureSettingEntity,
      SmartDepartureSnapshotEntity,
    ]),
    CommuteModule,
  ],
  controllers: [SmartDepartureController],
  providers: [
    // Repositories
    {
      provide: SMART_DEPARTURE_SETTING_REPOSITORY,
      useClass: SmartDepartureSettingRepositoryImpl,
    },
    {
      provide: SMART_DEPARTURE_SNAPSHOT_REPOSITORY,
      useClass: SmartDepartureSnapshotRepositoryImpl,
    },
    // Use Cases
    ManageSmartDepartureUseCase,
    CalculateDepartureUseCase,
    ScheduleDepartureAlertsUseCase,
  ],
  exports: [
    SMART_DEPARTURE_SETTING_REPOSITORY,
    SMART_DEPARTURE_SNAPSHOT_REPOSITORY,
    ManageSmartDepartureUseCase,
    CalculateDepartureUseCase,
    ScheduleDepartureAlertsUseCase,
  ],
})
export class SmartDepartureModule {}
