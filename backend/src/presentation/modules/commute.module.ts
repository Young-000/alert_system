import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { CommuteRouteEntity } from '@infrastructure/persistence/typeorm/commute-route.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';

// Repository Implementations
import { CommuteRouteRepositoryImpl } from '@infrastructure/persistence/repositories/commute-route.repository';
import { CommuteSessionRepositoryImpl } from '@infrastructure/persistence/repositories/commute-session.repository';
import { CheckpointRecordRepositoryImpl } from '@infrastructure/persistence/repositories/checkpoint-record.repository';

// Repository Symbols
import { COMMUTE_ROUTE_REPOSITORY } from '@domain/repositories/commute-route.repository';
import { COMMUTE_SESSION_REPOSITORY } from '@domain/repositories/commute-session.repository';
import { CHECKPOINT_RECORD_REPOSITORY } from '@domain/repositories/checkpoint-record.repository';

// Use Cases
import { ManageRouteUseCase } from '@application/use-cases/manage-route.use-case';
import { ManageCommuteSessionUseCase } from '@application/use-cases/manage-commute-session.use-case';
import { GetCommuteStatsUseCase } from '@application/use-cases/get-commute-stats.use-case';

// Controllers
import { RouteController } from '../controllers/route.controller';
import { CommuteController } from '../controllers/commute.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommuteRouteEntity,
      RouteCheckpointEntity,
      CommuteSessionEntity,
      CheckpointRecordEntity,
    ]),
  ],
  controllers: [RouteController, CommuteController],
  providers: [
    // Repositories
    {
      provide: COMMUTE_ROUTE_REPOSITORY,
      useClass: CommuteRouteRepositoryImpl,
    },
    {
      provide: COMMUTE_SESSION_REPOSITORY,
      useClass: CommuteSessionRepositoryImpl,
    },
    {
      provide: CHECKPOINT_RECORD_REPOSITORY,
      useClass: CheckpointRecordRepositoryImpl,
    },
    // Use Cases
    ManageRouteUseCase,
    ManageCommuteSessionUseCase,
    GetCommuteStatsUseCase,
  ],
  exports: [
    COMMUTE_ROUTE_REPOSITORY,
    COMMUTE_SESSION_REPOSITORY,
    CHECKPOINT_RECORD_REPOSITORY,
    ManageRouteUseCase,
    ManageCommuteSessionUseCase,
    GetCommuteStatsUseCase,
  ],
})
export class CommuteModule {}
