import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('regional_insights', { schema: 'alert_system' })
@Unique('regional_insights_region_id_unique', ['regionId'])
@Index('regional_insights_region_id_idx', ['regionId'])
@Index('regional_insights_user_count_idx', ['userCount'])
@Index('regional_insights_session_count_idx', ['sessionCount'])
export class RegionalInsightEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'region_id', length: 50 })
  regionId: string;

  @Column({ name: 'region_name', length: 255 })
  regionName: string;

  @Column({ name: 'grid_lat', type: 'real' })
  gridLat: number;

  @Column({ name: 'grid_lng', type: 'real' })
  gridLng: number;

  @Column({ name: 'avg_duration_minutes', type: 'real', default: 0 })
  avgDurationMinutes: number;

  @Column({ name: 'median_duration_minutes', type: 'real', default: 0 })
  medianDurationMinutes: number;

  @Column({ name: 'user_count', type: 'integer', default: 0 })
  userCount: number;

  @Column({ name: 'session_count', type: 'integer', default: 0 })
  sessionCount: number;

  @Column({ name: 'peak_hour_distribution', type: 'text', default: '{}' })
  peakHourDistribution: string;

  @Column({ name: 'week_trend', type: 'real', default: 0 })
  weekTrend: number;

  @Column({ name: 'month_trend', type: 'real', default: 0 })
  monthTrend: number;

  @Column({ name: 'last_calculated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
