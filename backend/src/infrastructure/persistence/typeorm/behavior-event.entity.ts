import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { AlertEntity } from './alert.entity';

@Entity('behavior_events', { schema: 'alert_system' })
@Index(['userId'])
@Index(['timestamp'])
@Index(['eventType'])
@Index(['userId', 'timestamp'])
export class BehaviorEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'alert_id', nullable: true })
  alertId?: string;

  @Column({ name: 'event_type', length: 50 })
  eventType: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number;

  @Column({ name: 'is_weekday' })
  isWeekday: boolean;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: object;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => AlertEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'alert_id' })
  alert?: AlertEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
