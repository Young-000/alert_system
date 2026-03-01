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

@Entity('community_tips', { schema: 'alert_system' })
@Index('community_tips_checkpoint_key_idx', ['checkpointKey', 'isHidden', 'createdAt'])
@Index('community_tips_author_daily_idx', ['authorId', 'createdAt'])
export class CommunityTipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'checkpoint_key', length: 200 })
  checkpointKey: string;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @Column({ length: 100 })
  content: string;

  @Column({ name: 'helpful_count', type: 'integer', default: 0 })
  helpfulCount: number;

  @Column({ name: 'report_count', type: 'integer', default: 0 })
  reportCount: number;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
