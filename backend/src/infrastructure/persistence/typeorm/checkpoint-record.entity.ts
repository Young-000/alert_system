import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommuteSessionEntity } from './commute-session.entity';
import { RouteCheckpointEntity } from './route-checkpoint.entity';

@Entity('checkpoint_records', { schema: 'alert_system' })
@Index(['sessionId'])
@Index(['checkpointId'])
@Index(['sessionId', 'arrivedAt'])
export class CheckpointRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'uuid', name: 'checkpoint_id' })
  checkpointId: string;

  // 이 체크포인트 도착 시간
  @Column({ name: 'arrived_at', type: 'timestamptz' })
  arrivedAt: Date;

  // 이전 체크포인트부터 실제 이동 시간 (분)
  @Column({ name: 'actual_duration_from_previous', type: 'integer', nullable: true })
  durationFromPrevious?: number;

  // 이 체크포인트에서의 실제 대기 시간 (분) - 예: 지하철 기다린 시간
  @Column({ name: 'actual_wait_time', type: 'integer', default: 0 })
  actualWaitTime: number;

  // 예상보다 늦었는지 - DB에 없으므로 computed property로 처리
  get isDelayed(): boolean {
    return (this.delayMinutes || 0) > 0;
  }

  // 지연 시간 (분) - 음수면 빨리 도착
  @Column({ name: 'delay_minutes', type: 'integer', default: 0 })
  delayMinutes: number;

  // 대기 시간 지연 (분) - 예상 대기 시간 대비 실제 대기 시간 차이
  @Column({ name: 'wait_delay_minutes', type: 'integer', default: 0 })
  waitDelayMinutes: number;

  // 메모 (예: "지하철 지연", "엘리베이터 대기", "환승 복잡")
  @Column({ length: 255, nullable: true })
  notes?: string;

  @ManyToOne(() => CommuteSessionEntity, (session) => session.checkpointRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session?: CommuteSessionEntity;

  @ManyToOne(() => RouteCheckpointEntity, (checkpoint) => checkpoint.records, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint?: RouteCheckpointEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
