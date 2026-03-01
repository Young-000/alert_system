export interface ICommunityTipHelpfulRepository {
  exists(tipId: string, userId: string): Promise<boolean>;

  save(tipId: string, userId: string): Promise<void>;

  remove(tipId: string, userId: string): Promise<boolean>;

  findUserHelpfulTipIds(userId: string, tipIds: string[]): Promise<string[]>;
}

export const COMMUNITY_TIP_HELPFUL_REPOSITORY = Symbol('ICommunityTipHelpfulRepository');
