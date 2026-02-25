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
import { MissionEntity } from './mission.entity';

@Entity('daily_mission_records', { schema: 'alert_system' })
@Unique(['userId', 'missionId', 'date'])
@Index(['userId', 'date'])
export class DailyMissionRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'mission_id' })
  missionId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => MissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mission_id' })
  mission?: MissionEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
