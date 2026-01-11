import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('weather_cache', { schema: 'alert_system' })
@Index(['lat', 'lng'])
export class WeatherCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  lng: number;

  @Column()
  location: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  temperature: number;

  @Column()
  condition: string;

  @Column()
  humidity: number;

  @Column({ name: 'wind_speed', type: 'decimal', precision: 5, scale: 2 })
  windSpeed: number;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
