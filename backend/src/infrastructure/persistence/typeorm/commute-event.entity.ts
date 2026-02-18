import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { UserPlaceEntity } from './user-place.entity';
import { CommuteSessionEntity } from './commute-session.entity';

@Entity('commute_events', { schema: 'alert_system' })
@Index(['userId'])
@Index(['placeId'])
@Index(['triggeredAt'])
@Index(['userId', 'triggeredAt'])
@Index(['userId', 'isProcessed'])
export class CommuteEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'place_id' })
  placeId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType: string;

  @Column({ name: 'triggered_at', type: 'timestamptz' })
  triggeredAt: Date;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'now()' })
  recordedAt: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude?: number;

  @Column({ type: 'double precision', nullable: true })
  longitude?: number;

  @Column({ name: 'accuracy_m', type: 'double precision', nullable: true })
  accuracyM?: number;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar', length: 20, default: 'geofence' })
  source: string;

  @Column({ name: 'is_processed', type: 'boolean', default: false })
  isProcessed: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => UserPlaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place?: UserPlaceEntity;

  @ManyToOne(() => CommuteSessionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session?: CommuteSessionEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
