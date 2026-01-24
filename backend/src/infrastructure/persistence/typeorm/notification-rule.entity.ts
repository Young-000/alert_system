import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('notification_rules', { schema: 'alert_system' })
@Index(['category'])
@Index(['enabled'])
@Index(['isSystemRule'])
export class NotificationRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'integer', default: 50 })
  priority: number;

  @Column({ type: 'simple-json' })
  conditions: object[];

  @Column({ name: 'message_template', type: 'text' })
  messageTemplate: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'is_system_rule', default: true })
  isSystemRule: boolean;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
