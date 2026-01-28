import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';

export interface ICommuteSessionRepository {
  save(session: CommuteSession): Promise<CommuteSession>;
  findById(id: string): Promise<CommuteSession | undefined>;
  findByIdWithRecords(id: string): Promise<CommuteSession | undefined>;
  findByUserId(userId: string, limit?: number): Promise<CommuteSession[]>;
  findByUserIdAndStatus(
    userId: string,
    status: SessionStatus,
    limit?: number
  ): Promise<CommuteSession[]>;
  findInProgressByUserId(userId: string): Promise<CommuteSession | undefined>;
  findByUserIdInDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommuteSession[]>;
  findByRouteId(routeId: string, limit?: number): Promise<CommuteSession[]>;
  update(session: CommuteSession): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<number>;
}

export const COMMUTE_SESSION_REPOSITORY = Symbol('ICommuteSessionRepository');
