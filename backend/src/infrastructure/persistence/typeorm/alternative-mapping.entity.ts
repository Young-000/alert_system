import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('alternative_mappings', { schema: 'alert_system' })
@Index('alternative_mappings_from_station_line_idx', ['fromStationName', 'fromLine'])
export class AlternativeMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_station_name', length: 100 })
  fromStationName: string;

  @Column({ name: 'from_line', length: 50 })
  fromLine: string;

  @Column({ name: 'to_station_name', length: 100 })
  toStationName: string;

  @Column({ name: 'to_line', length: 50 })
  toLine: string;

  @Column({ name: 'walking_minutes', type: 'integer' })
  walkingMinutes: number;

  @Column({ name: 'walking_distance_meters', type: 'integer', nullable: true })
  walkingDistanceMeters?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_bidirectional', default: true })
  isBidirectional: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
