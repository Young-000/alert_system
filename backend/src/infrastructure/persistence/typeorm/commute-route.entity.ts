import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RouteCheckpointEntity } from './route-checkpoint.entity';
import { CommuteSessionEntity } from './commute-session.entity';

export type RouteType = 'morning' | 'evening' | 'custom';

@Entity('commute_routes', { schema: 'alert_system' })
@Index(['userId'])
@Index(['userId', 'routeType'])
export class CommuteRouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'route_type', length: 20 })
  routeType: RouteType;

  @Column({ name: 'is_preferred', default: false })
  isPreferred: boolean;

  @Column({ name: 'total_expected_duration', type: 'integer', nullable: true })
  totalExpectedDuration?: number; // 총 예상 소요 시간 (분)

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @OneToMany(() => RouteCheckpointEntity, (checkpoint) => checkpoint.route, {
    cascade: true,
  })
  checkpoints?: RouteCheckpointEntity[];

  @OneToMany(() => CommuteSessionEntity, (session) => session.route)
  sessions?: CommuteSessionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
