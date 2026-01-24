import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subway_arrival_cache', { schema: 'alert_system' })
@Index(['stationName'])
export class SubwayArrivalCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'station_name' })
  stationName: string;

  @Column({ type: 'simple-json' })
  arrivals: Array<{
    stationId: string;
    subwayId: string;
    direction: string;
    arrivalTime: number;
    destination: string;
  }>;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}

@Entity('bus_arrival_cache', { schema: 'alert_system' })
@Index(['stopId'])
export class BusArrivalCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stop_id' })
  stopId: string;

  @Column({ type: 'simple-json' })
  arrivals: Array<{
    stopId: string;
    routeId: string;
    routeName: string;
    arrivalTime: number;
    stationOrder: number;
  }>;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}

@Entity('api_call_log', { schema: 'alert_system' })
@Index(['apiName', 'calledAt'])
export class ApiCallLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'api_name' })
  apiName: string;

  @Column()
  endpoint: string;

  @CreateDateColumn({ name: 'called_at' })
  calledAt: Date;

  @Column()
  success: boolean;

  @Column({ name: 'response_time_ms' })
  responseTimeMs: number;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;
}
