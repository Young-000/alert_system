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
import { CommuteRouteEntity } from './commute-route.entity';

@Entity('smart_departure_settings', { schema: 'alert_system' })
@Index(['userId'])
@Unique('smart_departure_settings_user_type_unique', ['userId', 'departureType'])
export class SmartDepartureSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'route_id' })
  routeId: string;

  @Column({ name: 'departure_type', type: 'varchar', length: 20 })
  departureType: string;

  @Column({ name: 'arrival_target', type: 'time' })
  arrivalTarget: string;

  @Column({ name: 'prep_time_minutes', type: 'integer', default: 30 })
  prepTimeMinutes: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'active_days', type: 'simple-array' })
  activeDays: string; // stored as comma-separated, mapped in repository

  @Column({ name: 'pre_alerts', type: 'simple-array' })
  preAlerts: string; // stored as comma-separated, mapped in repository

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => CommuteRouteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route?: CommuteRouteEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
