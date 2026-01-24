import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';

export interface ICommuteRecordRepository {
  save(record: CommuteRecord): Promise<void>;
  findById(id: string): Promise<CommuteRecord | undefined>;
  findByUserId(userId: string, limit?: number): Promise<CommuteRecord[]>;
  findByUserIdAndType(
    userId: string,
    commuteType: CommuteType,
    limit?: number
  ): Promise<CommuteRecord[]>;
  findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommuteRecord[]>;
  findRecentByUserId(userId: string, days: number): Promise<CommuteRecord[]>;
  countByUserId(userId: string): Promise<number>;
  deleteOlderThan(cutoffDate: Date): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
}

export const COMMUTE_RECORD_REPOSITORY = Symbol('ICommuteRecordRepository');
