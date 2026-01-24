import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehaviorController } from '../controllers/behavior.controller';
import { BehaviorEventEntity } from '@infrastructure/persistence/typeorm/behavior-event.entity';
import { UserPatternEntity } from '@infrastructure/persistence/typeorm/user-pattern.entity';
import { CommuteRecordEntity } from '@infrastructure/persistence/typeorm/commute-record.entity';
import { BehaviorEventRepositoryImpl } from '@infrastructure/persistence/repositories/behavior-event.repository';
import { UserPatternRepositoryImpl } from '@infrastructure/persistence/repositories/user-pattern.repository';
import { CommuteRecordRepositoryImpl } from '@infrastructure/persistence/repositories/commute-record.repository';
import { BEHAVIOR_EVENT_REPOSITORY } from '@domain/repositories/behavior-event.repository';
import { USER_PATTERN_REPOSITORY } from '@domain/repositories/user-pattern.repository';
import { COMMUTE_RECORD_REPOSITORY } from '@domain/repositories/commute-record.repository';
import { PatternAnalysisService, PATTERN_ANALYSIS_SERVICE } from '@application/services/pattern-analysis.service';
import { TrackBehaviorUseCase } from '@application/use-cases/track-behavior.use-case';
import { PredictOptimalDepartureUseCase, USER_PATTERN_REPOSITORY as PREDICT_USER_PATTERN_REPO } from '@application/use-cases/predict-optimal-departure.use-case';
import { AlertEntity } from '@infrastructure/persistence/typeorm/alert.entity';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehaviorEventEntity,
      UserPatternEntity,
      CommuteRecordEntity,
      AlertEntity,
    ]),
  ],
  controllers: [BehaviorController],
  providers: [
    // Repositories
    {
      provide: BEHAVIOR_EVENT_REPOSITORY,
      useClass: BehaviorEventRepositoryImpl,
    },
    {
      provide: USER_PATTERN_REPOSITORY,
      useClass: UserPatternRepositoryImpl,
    },
    {
      provide: COMMUTE_RECORD_REPOSITORY,
      useClass: CommuteRecordRepositoryImpl,
    },
    BehaviorEventRepositoryImpl,
    UserPatternRepositoryImpl,
    CommuteRecordRepositoryImpl,

    // Services
    {
      provide: PATTERN_ANALYSIS_SERVICE,
      useClass: PatternAnalysisService,
    },
    PatternAnalysisService,

    // Use Cases
    TrackBehaviorUseCase,
    PredictOptimalDepartureUseCase,

    // Alert Repository for PredictOptimalDeparture
    {
      provide: 'ALERT_REPOSITORY',
      useClass: PostgresAlertRepository,
    },
    {
      provide: PREDICT_USER_PATTERN_REPO,
      useClass: UserPatternRepositoryImpl,
    },
  ],
  exports: [
    BEHAVIOR_EVENT_REPOSITORY,
    USER_PATTERN_REPOSITORY,
    COMMUTE_RECORD_REPOSITORY,
    PATTERN_ANALYSIS_SERVICE,
    TrackBehaviorUseCase,
    PredictOptimalDepartureUseCase,
  ],
})
export class BehaviorModule {}
