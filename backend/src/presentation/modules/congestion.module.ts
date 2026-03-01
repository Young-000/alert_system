import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { SegmentCongestionEntity } from '@infrastructure/persistence/typeorm/segment-congestion.entity';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';

// Repository
import { SegmentCongestionRepositoryImpl } from '@infrastructure/persistence/repositories/segment-congestion.repository';
import { SEGMENT_CONGESTION_REPOSITORY } from '@domain/repositories/segment-congestion.repository';

// Services
import { CongestionAggregationService } from '@application/services/congestion/congestion-aggregation.service';
import { CongestionService } from '@application/services/congestion/congestion.service';

// Controller
import { CongestionController } from '../controllers/congestion.controller';

// Commute module for route repository
import { CommuteModule } from './commute.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SegmentCongestionEntity,
      CheckpointRecordEntity,
      CommuteSessionEntity,
      RouteCheckpointEntity,
    ]),
    CommuteModule,
  ],
  controllers: [CongestionController],
  providers: [
    // Repository
    {
      provide: SEGMENT_CONGESTION_REPOSITORY,
      useClass: SegmentCongestionRepositoryImpl,
    },
    // Services
    CongestionAggregationService,
    CongestionService,
  ],
  exports: [
    SEGMENT_CONGESTION_REPOSITORY,
    CongestionAggregationService,
    CongestionService,
  ],
})
export class CongestionModule {}
