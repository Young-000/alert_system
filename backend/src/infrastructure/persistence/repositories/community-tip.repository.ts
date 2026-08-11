import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CommunityTipEntity } from '../typeorm/community-tip.entity';
import {
  ICommunityTipRepository,
  FindTipsOptions,
} from '@domain/repositories/community-tip.repository';
import { CommunityTip } from '@domain/entities/community-tip.entity';
import { getTodayKST, toDateKST } from '@domain/utils/kst-date';

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
    // "오늘"의 경계는 KST 자정이다. 오프셋 산술을 여기서 다시 짜면
    // kst-date의 정의와 갈라질 수 있으므로 공용 헬퍼만 쓴다.
    return this.repository.count({
      where: {
        authorId: userId,
        createdAt: MoreThanOrEqual(toDateKST(getTodayKST())),
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
