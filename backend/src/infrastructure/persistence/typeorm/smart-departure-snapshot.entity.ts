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

  @Column({ name: 'optimal_departure_at', type: 'timestamptz' })
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

  @Column({ name: 'alerts_sent', type: 'simple-array', nullable: true })
  alertsSent: string; // stored as comma-separated, mapped in repository

  @Column({ name: 'departed_at', type: 'timestamptz', nullable: true })
  departedAt: Date | null;

  @Column({ name: 'schedule_ids', type: 'simple-array', nullable: true })
  scheduleIds: string; // stored as comma-separated

  @Column({ name: 'calculated_at', type: 'timestamptz', default: () => 'now()' })
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
