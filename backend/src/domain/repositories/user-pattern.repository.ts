import { UserPattern, PatternType } from '@domain/entities/user-pattern.entity';

export interface IUserPatternRepository {
  save(pattern: UserPattern): Promise<void>;
  findById(id: string): Promise<UserPattern | undefined>;
  findByUserId(userId: string): Promise<UserPattern[]>;
  findByUserIdAndType(
    userId: string,
    patternType: PatternType
  ): Promise<UserPattern | undefined>;
  findByUserIdTypeAndDay(
    userId: string,
    patternType: PatternType,
    dayOfWeek?: number,
    isWeekday?: boolean
  ): Promise<UserPattern | undefined>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export const USER_PATTERN_REPOSITORY = Symbol('IUserPatternRepository');
