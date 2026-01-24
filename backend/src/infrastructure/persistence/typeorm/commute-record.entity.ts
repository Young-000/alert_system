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

@Entity('commute_records', { schema: 'alert_system' })
@Index(['userId'])
@Index(['commuteDate'])
@Index(['userId', 'commuteDate'])
export class CommuteRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'alert_id', nullable: true })
  alertId?: string;

  @Column({ name: 'commute_date', type: 'date' })
  commuteDate: Date;

  @Column({ name: 'commute_type', length: 20 })
  commuteType: string;

  @Column({ name: 'scheduled_departure', type: 'time', nullable: true })
  scheduledDeparture?: string;

  @Column({ name: 'actual_departure', type: 'timestamptz', nullable: true })
  actualDeparture?: Date;

  @Column({ name: 'weather_condition', length: 50, nullable: true })
  weatherCondition?: string;

  @Column({ name: 'transit_delay_minutes', type: 'integer', nullable: true })
  transitDelayMinutes?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => AlertEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'alert_id' })
  alert?: AlertEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
