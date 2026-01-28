import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';

export interface ICheckpointRecordRepository {
  save(record: CheckpointRecord): Promise<CheckpointRecord>;
  findById(id: string): Promise<CheckpointRecord | undefined>;
  findBySessionId(sessionId: string): Promise<CheckpointRecord[]>;
  findByCheckpointId(checkpointId: string, limit?: number): Promise<CheckpointRecord[]>;
  findLatestBySessionId(sessionId: string): Promise<CheckpointRecord | undefined>;
  countBySessionId(sessionId: string): Promise<number>;
  delete(id: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<number>;
}

export const CHECKPOINT_RECORD_REPOSITORY = Symbol('ICheckpointRecordRepository');
