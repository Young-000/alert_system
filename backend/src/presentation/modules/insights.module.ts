import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { RegionalInsightEntity } from '@infrastructure/persistence/typeorm/regional-insight.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';
import { UserPlaceEntity } from '@infrastructure/persistence/typeorm/user-place.entity';

// Repository
import { RegionalInsightRepositoryImpl } from '@infrastructure/persistence/repositories/regional-insight.repository';
import { REGIONAL_INSIGHT_REPOSITORY } from '@domain/repositories/regional-insight.repository';

// Services
import { InsightsAggregationService } from '@application/services/insights/insights-aggregation.service';
import { InsightsService } from '@application/services/insights/insights.service';

// Controller
import { InsightsController } from '../controllers/insights.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegionalInsightEntity,
      CommuteSessionEntity,
      RouteCheckpointEntity,
      CheckpointRecordEntity,
      UserPlaceEntity,
    ]),
  ],
  controllers: [InsightsController],
  providers: [
    // Repository
    {
      provide: REGIONAL_INSIGHT_REPOSITORY,
      useClass: RegionalInsightRepositoryImpl,
    },
    // Services
    InsightsAggregationService,
    InsightsService,
  ],
  exports: [
    REGIONAL_INSIGHT_REPOSITORY,
    InsightsAggregationService,
    InsightsService,
  ],
})
export class InsightsModule {}
