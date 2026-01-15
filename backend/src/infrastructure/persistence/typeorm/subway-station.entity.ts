import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subway_stations', { schema: 'alert_system' })
@Index(['name', 'line'], { unique: true })
export class SubwayStationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column()
  line: string;

  @Column({ nullable: true })
  code?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
