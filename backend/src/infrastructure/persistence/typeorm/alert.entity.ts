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

export enum AlertTypeEnum {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

@Entity('alerts', { schema: 'alert_system' })
@Index(['userId'])
export class AlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  name: string;

  // DDL은 varchar(100)이다 (schema.sql:33). 길이를 생략하면 TypeORM이 255로 잡아
  // synchronize 기반 테스트가 실제 컬럼 폭을 못 본다.
  @Column({ length: 100 })
  schedule: string;

  @Column({ type: 'simple-json', name: 'alert_types' })
  alertTypes: string[];

  @Column({ default: true })
  enabled: boolean;

  // DDL은 varchar(100)이다 (schema.sql:36).
  @Column({ length: 100, nullable: true, name: 'bus_stop_id' })
  busStopId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'subway_station_id' })
  subwayStationId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'route_id' })
  routeId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
