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
import { SmartDepartureSettingEntity } from './smart-departure-setting.entity';

@Entity('live_activity_tokens', { schema: 'alert_system' })
@Index(['userId'])
@Index(['activityId'], { unique: true })
@Index(['isActive'])
export class LiveActivityTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'activity_id' })
  activityId: string;

  @Column({ type: 'text', name: 'push_token' })
  pushToken: string;

  @Column({ type: 'varchar', length: 20 })
  mode: string;

  @Column({ type: 'uuid', name: 'setting_id', nullable: true })
  settingId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => SmartDepartureSettingEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'setting_id' })
  setting?: SmartDepartureSettingEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
