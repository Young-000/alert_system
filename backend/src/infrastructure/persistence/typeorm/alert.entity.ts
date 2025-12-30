import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
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

@Entity('alerts')
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  name: string;

  @Column()
  schedule: string;

  @Column({ type: 'jsonb' })
  alertTypes: string[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  busStopId?: string;

  @Column({ nullable: true })
  subwayStationId?: string;

  @CreateDateColumn()
  createdAt: Date;
}

