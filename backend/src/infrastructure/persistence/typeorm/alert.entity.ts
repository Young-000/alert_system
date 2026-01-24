import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum AlertTypeEnum {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

@Entity('alerts', { schema: 'alert_system' })
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  @Column()
  schedule: string;

  @Column({ type: 'simple-json', name: 'alert_types' })
  alertTypes: string[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true, name: 'bus_stop_id' })
  busStopId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'subway_station_id' })
  subwayStationId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
