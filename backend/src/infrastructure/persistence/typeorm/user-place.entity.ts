import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_places', { schema: 'alert_system' })
@Index(['userId'])
@Unique('user_places_user_type_unique', ['userId', 'placeType'])
export class UserPlaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ name: 'place_type', type: 'varchar', length: 20 })
  placeType: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Column({ name: 'radius_m', type: 'integer', default: 200 })
  radiusM: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
