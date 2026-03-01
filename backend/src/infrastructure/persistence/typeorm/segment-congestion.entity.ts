import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('segment_congestion', { schema: 'alert_system' })
@Unique('segment_congestion_segment_slot_unique', ['segmentKey', 'timeSlot'])
@Index('segment_congestion_segment_key_idx', ['segmentKey'])
@Index('segment_congestion_time_slot_idx', ['timeSlot'])
@Index('segment_congestion_level_idx', ['congestionLevel'])
export class SegmentCongestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'segment_key', length: 255 })
  segmentKey: string;

  @Column({ name: 'checkpoint_name', length: 255 })
  checkpointName: string;

  @Column({ name: 'checkpoint_type', length: 50 })
  checkpointType: string;

  @Column({ name: 'line_info', length: 100, nullable: true })
  lineInfo?: string;

  @Column({ name: 'linked_station_id', length: 255, nullable: true })
  linkedStationId?: string;

  @Column({ name: 'linked_bus_stop_id', length: 255, nullable: true })
  linkedBusStopId?: string;

  @Column({ name: 'time_slot', length: 30 })
  timeSlot: string;

  @Column({ name: 'avg_wait_minutes', type: 'real', default: 0 })
  avgWaitMinutes: number;

  @Column({ name: 'avg_delay_minutes', type: 'real', default: 0 })
  avgDelayMinutes: number;

  @Column({ name: 'std_dev_minutes', type: 'real', default: 0 })
  stdDevMinutes: number;

  @Column({ name: 'sample_count', type: 'integer', default: 0 })
  sampleCount: number;

  @Column({ name: 'congestion_level', length: 20, default: 'moderate' })
  congestionLevel: string;

  @Column({ type: 'real', default: 0.3 })
  confidence: number;

  @Column({ name: 'last_updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
