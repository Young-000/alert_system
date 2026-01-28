import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommuteRouteEntity } from './commute-route.entity';
import { SubwayStationEntity } from './subway-station.entity';
import { CheckpointRecordEntity } from './checkpoint-record.entity';

// 체크포인트 타입: 집, 지하철역, 버스정류장, 환승지점, 회사, 기타
export type CheckpointType =
  | 'home'
  | 'subway'
  | 'bus_stop'
  | 'transfer_point' // 환승 지점 (같은 역 내 다른 노선으로 갈아탈 때)
  | 'work'
  | 'custom';

// 이동 수단: 도보, 지하철, 버스, 환승(대기)
export type TransportMode =
  | 'walk'
  | 'subway'
  | 'bus'
  | 'transfer' // 환승 대기 시간
  | 'taxi'
  | 'bike';

@Entity('route_checkpoints', { schema: 'alert_system' })
@Index(['routeId'])
@Index(['routeId', 'sequenceOrder'])
export class RouteCheckpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'route_id' })
  routeId: string;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'checkpoint_type', length: 30 })
  checkpointType: CheckpointType;

  // 지하철역 연결 (선택)
  @Column({ type: 'uuid', name: 'linked_station_id', nullable: true })
  linkedStationId?: string;

  // 버스 정류장 ID (선택, 외부 API용)
  @Column({ name: 'linked_bus_stop_id', length: 100, nullable: true })
  linkedBusStopId?: string;

  // 노선 정보 (지하철 몇호선, 버스 몇번 등)
  @Column({ name: 'line_info', length: 50, nullable: true })
  lineInfo?: string;

  // 다음 체크포인트까지 이동 예상 시간 (분)
  @Column({ name: 'expected_duration_to_next', type: 'integer', nullable: true })
  expectedDurationToNext?: number;

  // 환승/대기 예상 시간 (분) - 지하철 기다리는 시간, 환승 걸어가는 시간 등
  @Column({ name: 'expected_wait_time', type: 'integer', default: 0 })
  expectedWaitTime: number;

  // 다음 체크포인트까지 이동 수단
  @Column({ name: 'transport_mode', length: 20, nullable: true })
  transportMode?: TransportMode;

  @ManyToOne(() => CommuteRouteEntity, (route) => route.checkpoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route?: CommuteRouteEntity;

  @ManyToOne(() => SubwayStationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_station_id' })
  linkedStation?: SubwayStationEntity;

  @OneToMany(() => CheckpointRecordEntity, (record) => record.checkpoint)
  records?: CheckpointRecordEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
