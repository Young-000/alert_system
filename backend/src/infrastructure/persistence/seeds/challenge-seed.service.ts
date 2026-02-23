import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeTemplateEntity } from '../typeorm/challenge-template.entity';
import { CHALLENGE_TEMPLATE_SEEDS } from './challenge-template.seed';

@Injectable()
export class ChallengeSeedService implements OnModuleInit {
  private readonly logger = new Logger(ChallengeSeedService.name);

  constructor(
    @InjectRepository(ChallengeTemplateEntity)
    private readonly templateRepo: Repository<ChallengeTemplateEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedTemplates();
    } catch (error) {
      this.logger.error(`Failed to seed challenge templates: ${error.message}`);
    }
  }

  private async seedTemplates(): Promise<void> {
    for (const seed of CHALLENGE_TEMPLATE_SEEDS) {
      const exists = await this.templateRepo.findOneBy({ id: seed.id });
      if (!exists) {
        await this.templateRepo.save({
          id: seed.id,
          category: seed.category,
          name: seed.name,
          description: seed.description,
          targetValue: seed.targetValue,
          conditionType: seed.conditionType,
          conditionValue: seed.conditionValue,
          durationDays: seed.durationDays,
          badgeId: seed.badgeId,
          badgeName: seed.badgeName,
          badgeEmoji: seed.badgeEmoji,
          difficulty: seed.difficulty,
          sortOrder: seed.sortOrder,
          isActive: seed.isActive,
        });
        this.logger.log(`Seeded challenge template: ${seed.id}`);
      }
    }
  }
}
