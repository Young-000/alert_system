import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { CommuteRouteEntity } from '@infrastructure/persistence/typeorm/commute-route.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';
import { RouteAnalyticsEntity } from '@infrastructure/persistence/typeorm/route-analytics.entity';

// Repository Implementations
import { CommuteRouteRepositoryImpl } from '@infrastructure/persistence/repositories/commute-route.repository';
import { CommuteSessionRepositoryImpl } from '@infrastructure/persistence/repositories/commute-session.repository';
import { CheckpointRecordRepositoryImpl } from '@infrastructure/persistence/repositories/checkpoint-record.repository';
import { RouteAnalyticsRepositoryImpl } from '@infrastructure/persistence/repositories/route-analytics.repository';

// Repository Symbols
import { COMMUTE_ROUTE_REPOSITORY } from '@domain/repositories/commute-route.repository';
import { COMMUTE_SESSION_REPOSITORY } from '@domain/repositories/commute-session.repository';
import { CHECKPOINT_RECORD_REPOSITORY } from '@domain/repositories/checkpoint-record.repository';
import { ROUTE_ANALYTICS_REPOSITORY } from '@domain/repositories/route-analytics.repository';

// Use Cases
import { ManageRouteUseCase } from '@application/use-cases/manage-route.use-case';
import { ManageCommuteSessionUseCase } from '@application/use-cases/manage-commute-session.use-case';
import { GetCommuteStatsUseCase } from '@application/use-cases/get-commute-stats.use-case';
import { RecommendBestRouteUseCase } from '@application/use-cases/recommend-best-route.use-case';
import { CalculateRouteAnalyticsUseCase } from '@application/use-cases/calculate-route-analytics.use-case';

// Controllers
import { RouteController } from '../controllers/route.controller';
import { CommuteController } from '../controllers/commute.controller';
import { AnalyticsController } from '../controllers/analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommuteRouteEntity,
      RouteCheckpointEntity,
      CommuteSessionEntity,
      CheckpointRecordEntity,
      RouteAnalyticsEntity,
    ]),
  ],
  controllers: [RouteController, CommuteController, AnalyticsController],
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
    {
      provide: ROUTE_ANALYTICS_REPOSITORY,
      useClass: RouteAnalyticsRepositoryImpl,
    },
    // Use Cases
    ManageRouteUseCase,
    ManageCommuteSessionUseCase,
    GetCommuteStatsUseCase,
    RecommendBestRouteUseCase,
    CalculateRouteAnalyticsUseCase,
  ],
  exports: [
    COMMUTE_ROUTE_REPOSITORY,
    COMMUTE_SESSION_REPOSITORY,
    CHECKPOINT_RECORD_REPOSITORY,
    ROUTE_ANALYTICS_REPOSITORY,
    ManageRouteUseCase,
    ManageCommuteSessionUseCase,
    GetCommuteStatsUseCase,
    RecommendBestRouteUseCase,
    CalculateRouteAnalyticsUseCase,
  ],
})
export class CommuteModule {}
