import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertEntity } from './alert.entity';

export enum AlertTypeEnum {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS = 'bus',
  SUBWAY = 'subway',
}

@Entity('alert_alert_types')
export class AlertAlertTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  alertId: string;

  @ManyToOne(() => AlertEntity)
  @JoinColumn({ name: 'alertId' })
  alert: AlertEntity;

  @Column({
    type: 'enum',
    enum: AlertTypeEnum,
  })
  alertType: AlertTypeEnum;
}
