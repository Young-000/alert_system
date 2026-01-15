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

@Entity('push_subscriptions', { schema: 'alert_system' })
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Index({ unique: true })
  @Column('text')
  endpoint: string;

  @Column({ type: 'jsonb' })
  keys: {
    p256dh: string;
    auth: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
