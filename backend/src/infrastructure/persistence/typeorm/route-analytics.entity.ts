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
import { CommuteRouteEntity } from './commute-route.entity';
import { SegmentStats, ConditionAnalysis } from '@domain/entities/route-analytics.entity';

@Entity('route_analytics', { schema: 'alert_system' })
@Index(['routeId'], { unique: true })
@Index(['totalScore', 'totalTrips'])
export class RouteAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'route_id' })
  routeId: string;

  @Column({ name: 'route_name', length: 100 })
  routeName: string;

  // 전체 통계
  @Column({ name: 'total_trips', type: 'integer', default: 0 })
  totalTrips: number;

  @Column({ name: 'last_trip_date', type: 'timestamptz', nullable: true })
  lastTripDate?: Date;

  // 시간 분석
  @Column({ name: 'avg_duration_minutes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgDurationMinutes: number;

  @Column({ name: 'min_duration_minutes', type: 'integer', default: 0 })
  minDurationMinutes: number;

  @Column({ name: 'max_duration_minutes', type: 'integer', default: 0 })
  maxDurationMinutes: number;

  @Column({ name: 'std_dev_minutes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stdDevMinutes: number;

  // 구간별 분석 (JSON)
  @Column({ name: 'segment_stats', type: 'jsonb', default: '[]' })
  segmentStats: SegmentStats[];

  // 조건별 분석 (JSON)
  @Column({ name: 'condition_analysis', type: 'jsonb', default: '{}' })
  conditionAnalysis: ConditionAnalysis;

  // 점수
  @Column({ name: 'speed_score', type: 'integer', default: 0 })
  speedScore: number;

  @Column({ name: 'reliability_score', type: 'integer', default: 0 })
  reliabilityScore: number;

  @Column({ name: 'comfort_score', type: 'integer', default: 0 })
  comfortScore: number;

  @Column({ name: 'total_score', type: 'integer', default: 0 })
  totalScore: number;

  // 마지막 계산 시간
  @Column({ name: 'last_calculated_at', type: 'timestamptz', default: () => 'NOW()' })
  lastCalculatedAt: Date;

  // 관계
  @ManyToOne(() => CommuteRouteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route?: CommuteRouteEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
