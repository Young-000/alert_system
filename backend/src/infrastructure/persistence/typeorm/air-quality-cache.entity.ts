import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('air_quality_cache', { schema: 'alert_system' })
@Index(['sidoName'])
export class AirQualityCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sido_name' })
  sidoName: string;

  @Column({ name: 'station_name' })
  stationName: string;

  @Column()
  pm10: number;

  @Column()
  pm25: number;

  @Column()
  aqi: number;

  @Column()
  status: string;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
