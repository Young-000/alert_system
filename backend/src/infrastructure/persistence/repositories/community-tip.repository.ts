import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CommunityTipEntity } from '../typeorm/community-tip.entity';
import {
  ICommunityTipRepository,
  FindTipsOptions,
} from '@domain/repositories/community-tip.repository';
import { CommunityTip } from '@domain/entities/community-tip.entity';

@Injectable()
export class CommunityTipRepositoryImpl implements ICommunityTipRepository {
  constructor(
    @InjectRepository(CommunityTipEntity)
    private readonly repository: Repository<CommunityTipEntity>,
  ) {}

  async findById(id: string): Promise<CommunityTip | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCheckpointKey(options: FindTipsOptions): Promise<CommunityTip[]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const entities = await this.repository.find({
      where: {
        checkpointKey: options.checkpointKey,
        isHidden: false,
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return entities.map((e) => this.toDomain(e));
  }

  async countByCheckpointKey(checkpointKey: string): Promise<number> {
    return this.repository.count({
      where: {
        checkpointKey,
        isHidden: false,
      },
    });
  }

  async countUserTipsToday(userId: string): Promise<number> {
    // KST = UTC+9 offset
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstStartOfDay = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()),
    );
    const utcStartOfDay = new Date(kstStartOfDay.getTime() - kstOffset);

    return this.repository.count({
      where: {
        authorId: userId,
        createdAt: MoreThanOrEqual(utcStartOfDay),
      },
    });
  }

  async save(tip: CommunityTip): Promise<CommunityTip> {
    const entity = this.toEntity(tip);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async incrementReportCount(tipId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(CommunityTipEntity)
      .set({ reportCount: () => 'report_count + 1' })
      .where('id = :tipId', { tipId })
      .execute();
  }

  async markHidden(tipId: string): Promise<void> {
    await this.repository.update(tipId, { isHidden: true });
  }

  async incrementHelpfulCount(tipId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(CommunityTipEntity)
      .set({ helpfulCount: () => 'helpful_count + 1' })
      .where('id = :tipId', { tipId })
      .execute();
  }

  async decrementHelpfulCount(tipId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(CommunityTipEntity)
      .set({ helpfulCount: () => 'GREATEST(helpful_count - 1, 0)' })
      .where('id = :tipId', { tipId })
      .execute();
  }

  private toDomain(entity: CommunityTipEntity): CommunityTip {
    return new CommunityTip({
      id: entity.id,
      checkpointKey: entity.checkpointKey,
      authorId: entity.authorId,
      content: entity.content,
      helpfulCount: entity.helpfulCount,
      reportCount: entity.reportCount,
      isHidden: entity.isHidden,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(tip: CommunityTip): CommunityTipEntity {
    const entity = new CommunityTipEntity();
    if (tip.id) entity.id = tip.id;
    entity.checkpointKey = tip.checkpointKey;
    entity.authorId = tip.authorId;
    entity.content = tip.content;
    entity.helpfulCount = tip.helpfulCount;
    entity.reportCount = tip.reportCount;
    entity.isHidden = tip.isHidden;
    return entity;
  }
}
