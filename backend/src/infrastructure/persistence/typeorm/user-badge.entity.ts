import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { UserChallengeEntity } from './user-challenge.entity';

@Entity('user_badges', { schema: 'alert_system' })
@Index(['userId'])
@Unique(['userId', 'badgeId'])
export class UserBadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'badge_id' })
  badgeId: string;

  @Column({ type: 'varchar', length: 100, name: 'badge_name' })
  badgeName: string;

  @Column({ type: 'varchar', length: 20, name: 'badge_emoji' })
  badgeEmoji: string;

  @Column({ type: 'uuid', name: 'challenge_id' })
  challengeId: string;

  @Column({ name: 'earned_at', type: 'timestamptz' })
  earnedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => UserChallengeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge?: UserChallengeEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
