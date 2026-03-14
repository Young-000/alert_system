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
      this.logger.error(`Failed to seed challenge templates: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async seedTemplates(): Promise<void> {
    // Fetch all existing IDs in a single query to avoid N+1 pattern
    const existingIds = await this.templateRepo
      .createQueryBuilder('t')
      .select('t.id')
      .getMany()
      .then((rows) => new Set(rows.map((r) => r.id)));

    const toInsert = CHALLENGE_TEMPLATE_SEEDS.filter((s) => !existingIds.has(s.id));
    if (toInsert.length === 0) return;

    await this.templateRepo.save(
      toInsert.map((seed) => ({
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
      })),
    );
    this.logger.log(`Seeded ${toInsert.length} challenge template(s)`);
  }
}
