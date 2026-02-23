import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { ChallengeTemplateEntity } from '@infrastructure/persistence/typeorm/challenge-template.entity';
import { UserChallengeEntity } from '@infrastructure/persistence/typeorm/user-challenge.entity';
import { UserBadgeEntity } from '@infrastructure/persistence/typeorm/user-badge.entity';

// Repository Implementation
import { TypeormChallengeRepository } from '@infrastructure/persistence/typeorm/challenge.repository.impl';

// Use Cases
import { ManageChallengeUseCase } from '@application/use-cases/manage-challenge.use-case';
import { EvaluateChallengeUseCase } from '@application/use-cases/evaluate-challenge.use-case';

// Seed Service
import { ChallengeSeedService } from '@infrastructure/persistence/seeds/challenge-seed.service';

// Controller
import { ChallengeController } from '../controllers/challenge.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChallengeTemplateEntity,
      UserChallengeEntity,
      UserBadgeEntity,
    ]),
  ],
  controllers: [ChallengeController],
  providers: [
    // Repository
    {
      provide: 'CHALLENGE_REPOSITORY',
      useClass: TypeormChallengeRepository,
    },
    // Use Cases
    ManageChallengeUseCase,
    EvaluateChallengeUseCase,
    // Seed Service
    ChallengeSeedService,
  ],
  exports: [
    'CHALLENGE_REPOSITORY',
    EvaluateChallengeUseCase,
    ManageChallengeUseCase,
  ],
})
export class ChallengeModule {}
