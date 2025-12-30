import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { AlertAlertTypeEntity } from './alert-alert-type.entity';

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

  @OneToMany(() => AlertAlertTypeEntity, (alertType) => alertType.alert, {
    cascade: true,
    eager: true,
  })
  alertTypes: AlertAlertTypeEntity[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  busStopId?: string;

  @Column({ nullable: true })
  subwayStationId?: string;

  @CreateDateColumn()
  createdAt: Date;
}

