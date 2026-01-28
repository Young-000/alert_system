import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CommuteRouteEntity } from './commute-route.entity';
import { CheckpointRecordEntity } from './checkpoint-record.entity';

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

@Entity('commute_sessions', { schema: 'alert_system' })
@Index(['userId'])
@Index(['routeId'])
@Index(['userId', 'startedAt'])
@Index(['status'])
export class CommuteSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'route_id' })
  routeId: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  // 총 소요 시간 (분)
  @Column({ name: 'total_duration_minutes', type: 'integer', nullable: true })
  totalDurationMinutes?: number;

  // 총 대기/환승 시간 (분) - 실제 이동 시간과 분리하여 파악
  @Column({ name: 'total_wait_minutes', type: 'integer', default: 0 })
  totalWaitMinutes: number;

  // 총 지연 시간 (분) - 예상 대비 얼마나 늦었는지
  @Column({ name: 'total_delay_minutes', type: 'integer', default: 0 })
  totalDelayMinutes: number;

  @Column({ length: 20, default: 'in_progress' })
  status: SessionStatus;

  // 날씨 조건 (비, 눈, 맑음 등)
  @Column({ name: 'weather_condition', length: 50, nullable: true })
  weatherCondition?: string;

  // 메모
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => CommuteRouteEntity, (route) => route.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route?: CommuteRouteEntity;

  @OneToMany(() => CheckpointRecordEntity, (record) => record.session, {
    cascade: true,
  })
  checkpointRecords?: CheckpointRecordEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
