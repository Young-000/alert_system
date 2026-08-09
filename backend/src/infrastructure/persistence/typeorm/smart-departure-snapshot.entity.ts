import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SmartDepartureSettingEntity } from './smart-departure-setting.entity';
import { TIMESTAMPTZ } from './column-types';

@Entity('smart_departure_snapshots', { schema: 'alert_system' })
@Index(['userId', 'departureDate'])
@Unique('smart_departure_snapshots_setting_date_unique', [
  'settingId',
  'departureDate',
])
@Index('smart_departure_snapshots_status_idx', ['status'])
export class SmartDepartureSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'setting_id' })
  settingId: string;

  @Column({ name: 'departure_date', type: 'date' })
  departureDate: string;

  @Column({ name: 'departure_type', type: 'varchar', length: 20 })
  departureType: string;

  @Column({ name: 'arrival_target', type: 'time' })
  arrivalTarget: string;

  @Column({ name: 'estimated_travel_min', type: 'integer' })
  estimatedTravelMin: number;

  @Column({ name: 'prep_time_minutes', type: 'integer' })
  prepTimeMinutes: number;

  @Column({ name: 'optimal_departure_at', type: TIMESTAMPTZ })
  optimalDepartureAt: Date;

  @Column({ name: 'baseline_travel_min', type: 'integer', nullable: true })
  baselineTravelMin: number | null;

  @Column({ name: 'history_avg_travel_min', type: 'integer', nullable: true })
  historyAvgTravelMin: number | null;

  @Column({
    name: 'realtime_adjustment_min',
    type: 'integer',
    default: 0,
  })
  realtimeAdjustmentMin: number;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status: string;

  // simple-array는 TypeORM이 하이드레이션 때 배열로 돌려준다 — string으로 선언 금지
  @Column({ name: 'alerts_sent', type: 'simple-array', nullable: true })
  alertsSent: string[] | null;

  @Column({ name: 'departed_at', type: TIMESTAMPTZ, nullable: true })
  departedAt: Date | null;

  @Column({ name: 'schedule_ids', type: 'simple-array', nullable: true })
  scheduleIds: string[] | null;

  @Column({ name: 'calculated_at', type: TIMESTAMPTZ, default: () => 'now()' })
  calculatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => SmartDepartureSettingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setting_id' })
  setting?: SmartDepartureSettingEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
