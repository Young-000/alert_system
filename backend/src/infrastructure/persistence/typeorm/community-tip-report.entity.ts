import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CommunityTipEntity } from './community-tip.entity';
import { UserEntity } from './user.entity';

@Entity('community_tip_reports', { schema: 'alert_system' })
@Unique('community_tip_reports_unique', ['tipId', 'reporterId'])
export class CommunityTipReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tip_id' })
  tipId: string;

  @Column({ type: 'uuid', name: 'reporter_id' })
  reporterId: string;

  @ManyToOne(() => CommunityTipEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tip_id' })
  tip?: CommunityTipEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter?: UserEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
