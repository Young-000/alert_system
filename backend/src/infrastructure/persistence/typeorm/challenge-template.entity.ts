import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('challenge_templates', { schema: 'alert_system' })
@Index(['category'])
export class ChallengeTemplateEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer', name: 'target_value' })
  targetValue: number;

  @Column({ type: 'varchar', length: 50, name: 'condition_type' })
  conditionType: string;

  @Column({ type: 'integer', name: 'condition_value' })
  conditionValue: number;

  @Column({ type: 'integer', name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'varchar', length: 100, name: 'badge_id' })
  badgeId: string;

  @Column({ type: 'varchar', length: 100, name: 'badge_name' })
  badgeName: string;

  @Column({ type: 'varchar', length: 20, name: 'badge_emoji' })
  badgeEmoji: string;

  @Column({ type: 'varchar', length: 20 })
  difficulty: string;

  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
