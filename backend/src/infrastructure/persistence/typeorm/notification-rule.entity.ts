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

@Entity('notification_rules', { schema: 'alert_system' })
@Index(['category'])
@Index(['enabled'])
@Index(['isSystemRule'])
@Index(['userId'])
export class NotificationRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'integer', default: 50 })
  priority: number;

  @Column({ type: 'simple-json' })
  conditions: object[];

  @Column({ name: 'message_template', type: 'text' })
  messageTemplate: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'is_system_rule', default: true })
  isSystemRule: boolean;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string;

  // user_id 는 nullable 이지만 NULL 은 "시스템 규칙"이라는 뜻이다(is_system_rule 기본 true).
  // 탈퇴 시 SET NULL 로 남기면 그 사용자의 개인 규칙이 시스템 규칙으로 승격돼
  // 전체 사용자에게 적용된다 — 규칙 조회 두 곳(findEnabledRules·findByCategories)은
  // 사용자로 거르지 않는다. DDL 도 CASCADE 다
  // (`database/migrations/20260120_add_notification_rules.sql:16`).
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
