import { CommuteEvent } from '@domain/entities/commute-event.entity';
import type { CommuteEventType } from '@domain/entities/commute-event.entity';

export interface ICommuteEventRepository {
  save(event: CommuteEvent): Promise<CommuteEvent>;
  saveBatch(events: CommuteEvent[]): Promise<CommuteEvent[]>;
  findById(id: string): Promise<CommuteEvent | undefined>;
  findByUserId(userId: string, limit?: number): Promise<CommuteEvent[]>;
  findRecent(
    userId: string,
    placeId: string,
    eventType: CommuteEventType,
    withinMs: number
  ): Promise<CommuteEvent | undefined>;
  markProcessed(id: string): Promise<void>;
  update(event: CommuteEvent): Promise<void>;
}

export const COMMUTE_EVENT_REPOSITORY = Symbol('ICommuteEventRepository');
