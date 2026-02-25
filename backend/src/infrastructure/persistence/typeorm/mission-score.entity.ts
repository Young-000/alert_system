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

@Entity('mission_scores', { schema: 'alert_system' })
@Unique(['userId', 'date'])
@Index(['userId', 'date'])
export class MissionScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer', name: 'total_missions', default: 0 })
  totalMissions: number;

  @Column({ type: 'integer', name: 'completed_missions', default: 0 })
  completedMissions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'completion_rate', default: 0 })
  completionRate: number;

  @Column({ type: 'integer', name: 'streak_day', default: 0 })
  streakDay: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
