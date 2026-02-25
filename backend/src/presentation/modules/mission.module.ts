import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { MissionEntity } from '@infrastructure/persistence/typeorm/mission.entity';
import { DailyMissionRecordEntity } from '@infrastructure/persistence/typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from '@infrastructure/persistence/typeorm/mission-score.entity';

// Repository Implementation
import { MissionRepositoryImpl } from '@infrastructure/persistence/mission.repository.impl';

// Use Cases
import { ManageMissionUseCase, MISSION_REPOSITORY } from '@application/use-cases/manage-mission.use-case';
import { DailyCheckUseCase } from '@application/use-cases/daily-check.use-case';
import { MissionStatsUseCase } from '@application/use-cases/mission-stats.use-case';

// Controller
import { MissionController } from '../controllers/mission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionEntity,
      DailyMissionRecordEntity,
      MissionScoreEntity,
    ]),
  ],
  controllers: [MissionController],
  providers: [
    // Repository
    {
      provide: MISSION_REPOSITORY,
      useClass: MissionRepositoryImpl,
    },
    // Use Cases
    ManageMissionUseCase,
    DailyCheckUseCase,
    MissionStatsUseCase,
  ],
  exports: [
    MISSION_REPOSITORY,
    ManageMissionUseCase,
    DailyCheckUseCase,
    MissionStatsUseCase,
  ],
})
export class MissionModule {}
