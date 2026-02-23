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
import { ChallengeTemplateEntity } from './challenge-template.entity';

@Entity('user_challenges', { schema: 'alert_system' })
@Index(['userId', 'status'])
@Index(['userId', 'challengeTemplateId'], {
  unique: true,
  where: "status = 'active'",
})
export class UserChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'challenge_template_id' })
  challengeTemplateId: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'deadline_at', type: 'timestamptz' })
  deadlineAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', name: 'current_progress', default: 0 })
  currentProgress: number;

  @Column({ type: 'integer', name: 'target_progress' })
  targetProgress: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => ChallengeTemplateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_template_id' })
  challengeTemplate?: ChallengeTemplateEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
