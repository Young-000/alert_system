import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { AlertEntity } from './alert.entity';

@Entity('notification_logs', { schema: 'alert_system' })
@Index(['userId', 'sentAt'])
@Index(['sentAt'])
@Index(['alertId'])
export class NotificationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'alert_id', nullable: true })
  alertId: string | null;

  @Column({ name: 'alert_name', length: 100, default: '' })
  alertName: string;

  @Column({ name: 'alert_types', type: 'simple-array' })
  alertTypes: string[];

  @Column({ length: 20, default: 'success' })
  status: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'NOW()' })
  sentAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => AlertEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'alert_id' })
  alert?: AlertEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
