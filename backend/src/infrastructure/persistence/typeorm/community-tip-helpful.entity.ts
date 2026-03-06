import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { CommunityTipEntity } from './community-tip.entity';
import { UserEntity } from './user.entity';

@Entity('community_tip_helpfuls', { schema: 'alert_system' })
@Unique('community_tip_helpfuls_unique', ['tipId', 'userId'])
@Index('community_tip_helpfuls_tip_id_idx', ['tipId'])
@Index('community_tip_helpfuls_user_id_idx', ['userId'])
export class CommunityTipHelpfulEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tip_id' })
  tipId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => CommunityTipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tip_id' })
  tip?: CommunityTipEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
