import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CommunityTipHelpfulEntity } from '../typeorm/community-tip-helpful.entity';
import { ICommunityTipHelpfulRepository } from '@domain/repositories/community-tip-helpful.repository';

@Injectable()
export class CommunityTipHelpfulRepositoryImpl implements ICommunityTipHelpfulRepository {
  constructor(
    @InjectRepository(CommunityTipHelpfulEntity)
    private readonly repository: Repository<CommunityTipHelpfulEntity>,
  ) {}

  async exists(tipId: string, userId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { tipId, userId },
    });
    return count > 0;
  }

  async save(tipId: string, userId: string): Promise<void> {
    const entity = new CommunityTipHelpfulEntity();
    entity.tipId = tipId;
    entity.userId = userId;
    await this.repository.save(entity);
  }

  async remove(tipId: string, userId: string): Promise<boolean> {
    const result = await this.repository.delete({ tipId, userId });
    return (result.affected ?? 0) > 0;
  }

  async findUserHelpfulTipIds(userId: string, tipIds: string[]): Promise<string[]> {
    if (tipIds.length === 0) return [];

    const entities = await this.repository.find({
      where: {
        userId,
        tipId: In(tipIds),
      },
      select: ['tipId'],
    });

    return entities.map((e) => e.tipId);
  }
}
