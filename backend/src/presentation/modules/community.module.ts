import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { CommunityTipEntity } from '@infrastructure/persistence/typeorm/community-tip.entity';
import { CommunityTipReportEntity } from '@infrastructure/persistence/typeorm/community-tip-report.entity';
import { CommunityTipHelpfulEntity } from '@infrastructure/persistence/typeorm/community-tip-helpful.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CommuteRouteEntity } from '@infrastructure/persistence/typeorm/commute-route.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';

// Repositories
import { CommunityTipRepositoryImpl } from '@infrastructure/persistence/repositories/community-tip.repository';
import { CommunityTipReportRepositoryImpl } from '@infrastructure/persistence/repositories/community-tip-report.repository';
import { CommunityTipHelpfulRepositoryImpl } from '@infrastructure/persistence/repositories/community-tip-helpful.repository';
import { COMMUNITY_TIP_REPOSITORY } from '@domain/repositories/community-tip.repository';
import { COMMUNITY_TIP_REPORT_REPOSITORY } from '@domain/repositories/community-tip-report.repository';
import { COMMUNITY_TIP_HELPFUL_REPOSITORY } from '@domain/repositories/community-tip-helpful.repository';

// Services
import { CommunityService } from '@application/services/community/community.service';
import { TipsService } from '@application/services/community/tips.service';

// Controller
import { CommunityController } from '../controllers/community.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityTipEntity,
      CommunityTipReportEntity,
      CommunityTipHelpfulEntity,
      RouteCheckpointEntity,
      CommuteRouteEntity,
      CommuteSessionEntity,
    ]),
  ],
  controllers: [CommunityController],
  providers: [
    // Repositories
    {
      provide: COMMUNITY_TIP_REPOSITORY,
      useClass: CommunityTipRepositoryImpl,
    },
    {
      provide: COMMUNITY_TIP_REPORT_REPOSITORY,
      useClass: CommunityTipReportRepositoryImpl,
    },
    {
      provide: COMMUNITY_TIP_HELPFUL_REPOSITORY,
      useClass: CommunityTipHelpfulRepositoryImpl,
    },
    // Services
    CommunityService,
    TipsService,
  ],
  exports: [CommunityService, TipsService],
})
export class CommunityModule {}
