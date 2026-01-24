import { BehaviorEvent, BehaviorEventType } from '@domain/entities/behavior-event.entity';

export interface IBehaviorEventRepository {
  save(event: BehaviorEvent): Promise<void>;
  findById(id: string): Promise<BehaviorEvent | undefined>;
  findByUserId(userId: string, limit?: number): Promise<BehaviorEvent[]>;
  findByUserIdAndType(
    userId: string,
    eventType: BehaviorEventType,
    limit?: number
  ): Promise<BehaviorEvent[]>;
  findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BehaviorEvent[]>;
  countByUserIdAndType(userId: string, eventType: BehaviorEventType): Promise<number>;
  deleteOlderThan(cutoffDate: Date): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
}

export const BEHAVIOR_EVENT_REPOSITORY = Symbol('IBehaviorEventRepository');
