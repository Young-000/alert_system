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

@Entity('user_patterns', { schema: 'alert_system' })
@Index(['userId'])
@Index(['patternType'])
@Index(['userId', 'patternType', 'dayOfWeek', 'isWeekday'], { unique: true })
export class UserPatternEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ name: 'pattern_type', length: 50 })
  patternType: string;

  @Column({ name: 'day_of_week', type: 'smallint', nullable: true })
  dayOfWeek?: number;

  @Column({ name: 'is_weekday', nullable: true })
  isWeekday?: boolean;

  @Column({ type: 'simple-json' })
  value: object;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.50 })
  confidence: number;

  @Column({ name: 'sample_count', type: 'integer', default: 0 })
  sampleCount: number;

  @Column({ name: 'last_updated', type: 'timestamptz', default: () => 'NOW()' })
  lastUpdated: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
