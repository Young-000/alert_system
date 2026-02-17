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

@Entity('commute_streaks', { schema: 'alert_system' })
@Index(['userId'], { unique: true })
@Index(['lastRecordDate'])
export class CommuteStreakOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @Column({ name: 'streak_start_date', type: 'date', nullable: true })
  streakStartDate: string | null;

  @Column({ name: 'last_record_date', type: 'date', nullable: true })
  lastRecordDate: string | null;

  @Column({ name: 'best_streak', type: 'integer', default: 0 })
  bestStreak: number;

  @Column({ name: 'best_streak_start', type: 'date', nullable: true })
  bestStreakStart: string | null;

  @Column({ name: 'best_streak_end', type: 'date', nullable: true })
  bestStreakEnd: string | null;

  @Column({ name: 'weekly_goal', type: 'integer', default: 5 })
  weeklyGoal: number;

  @Column({ name: 'weekly_count', type: 'integer', default: 0 })
  weeklyCount: number;

  @Column({ name: 'week_start_date', type: 'date', nullable: true })
  weekStartDate: string | null;

  @Column({ name: 'milestones_achieved', type: 'simple-array', default: '' })
  milestonesAchieved: string[];

  @Column({ name: 'latest_milestone', type: 'varchar', length: 10, nullable: true })
  latestMilestone: string | null;

  @Column({ name: 'exclude_weekends', type: 'boolean', default: false })
  excludeWeekends: boolean;

  @Column({ name: 'reminder_enabled', type: 'boolean', default: true })
  reminderEnabled: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
