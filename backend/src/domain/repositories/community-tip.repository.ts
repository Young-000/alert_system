import { CommunityTip } from '@domain/entities/community-tip.entity';

export interface FindTipsOptions {
  checkpointKey: string;
  page?: number;
  limit?: number;
  excludeHidden?: boolean;
}

export interface ICommunityTipRepository {
  findById(id: string): Promise<CommunityTip | null>;

  findByCheckpointKey(options: FindTipsOptions): Promise<CommunityTip[]>;

  countByCheckpointKey(checkpointKey: string): Promise<number>;

  countUserTipsToday(userId: string): Promise<number>;

  save(tip: CommunityTip): Promise<CommunityTip>;

  incrementReportCount(tipId: string): Promise<void>;

  markHidden(tipId: string): Promise<void>;

  incrementHelpfulCount(tipId: string): Promise<void>;

  decrementHelpfulCount(tipId: string): Promise<void>;
}

export const COMMUNITY_TIP_REPOSITORY = Symbol('ICommunityTipRepository');
