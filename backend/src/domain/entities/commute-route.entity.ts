export enum RouteType {
  MORNING = 'morning',
  EVENING = 'evening',
  CUSTOM = 'custom',
}

export interface RouteCheckpointData {
  id?: string;
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
  transportMode?: TransportMode;
}

export enum CheckpointType {
  HOME = 'home',
  SUBWAY = 'subway',
  BUS_STOP = 'bus_stop',
  TRANSFER_POINT = 'transfer_point', // 환승 지점
  WORK = 'work',
  CUSTOM = 'custom',
}

export enum TransportMode {
  WALK = 'walk',
  SUBWAY = 'subway',
  BUS = 'bus',
  TRANSFER = 'transfer', // 환승 대기
  TAXI = 'taxi',
  BIKE = 'bike',
}

export class CommuteRoute {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly routeType: RouteType;
  readonly isPreferred: boolean;
  readonly totalExpectedDuration?: number;
  readonly checkpoints: RouteCheckpoint[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    name: string,
    routeType: RouteType,
    options?: {
      id?: string;
      isPreferred?: boolean;
      totalExpectedDuration?: number;
      checkpoints?: RouteCheckpoint[];
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.name = name;
    this.routeType = routeType;
    this.isPreferred = options?.isPreferred ?? false;
    this.totalExpectedDuration = options?.totalExpectedDuration;
    this.checkpoints = options?.checkpoints || [];
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static create(
    userId: string,
    name: string,
    routeType: RouteType,
    checkpointsData: RouteCheckpointData[]
  ): CommuteRoute {
    const checkpoints = checkpointsData.map(
      (data) =>
        new RouteCheckpoint(data.sequenceOrder, data.name, data.checkpointType, {
          id: data.id,
          linkedStationId: data.linkedStationId,
          linkedBusStopId: data.linkedBusStopId,
          lineInfo: data.lineInfo,
          expectedDurationToNext: data.expectedDurationToNext,
          expectedWaitTime: data.expectedWaitTime,
          transportMode: data.transportMode,
        })
    );

    const totalExpectedDuration = checkpoints.reduce(
      (sum, cp) => sum + (cp.expectedDurationToNext || 0) + (cp.expectedWaitTime || 0),
      0
    );

    return new CommuteRoute(userId, name, routeType, {
      checkpoints,
      totalExpectedDuration,
    });
  }

  // 환승 시간 총합 계산
  getTotalTransferTime(): number {
    return this.checkpoints.reduce((sum, cp) => {
      if (cp.checkpointType === CheckpointType.TRANSFER_POINT) {
        return sum + (cp.expectedDurationToNext || 0) + (cp.expectedWaitTime || 0);
      }
      return sum + (cp.expectedWaitTime || 0);
    }, 0);
  }

  // 순수 이동 시간 (환승/대기 제외)
  getPureMovementTime(): number {
    return this.checkpoints.reduce((sum, cp) => {
      if (cp.checkpointType !== CheckpointType.TRANSFER_POINT) {
        return sum + (cp.expectedDurationToNext || 0);
      }
      return sum;
    }, 0);
  }

  // 체크포인트 개수
  getCheckpointCount(): number {
    return this.checkpoints.length;
  }
}

export class RouteCheckpoint {
  readonly id: string;
  readonly routeId: string;
  readonly sequenceOrder: number;
  readonly name: string;
  readonly checkpointType: CheckpointType;
  readonly linkedStationId?: string;
  readonly linkedBusStopId?: string;
  readonly lineInfo?: string;
  readonly expectedDurationToNext?: number;
  readonly expectedWaitTime: number;
  readonly transportMode?: TransportMode;
  readonly createdAt: Date;

  constructor(
    sequenceOrder: number,
    name: string,
    checkpointType: CheckpointType,
    options?: {
      id?: string;
      routeId?: string;
      linkedStationId?: string;
      linkedBusStopId?: string;
      lineInfo?: string;
      expectedDurationToNext?: number;
      expectedWaitTime?: number;
      transportMode?: TransportMode;
      createdAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.routeId = options?.routeId || '';
    this.sequenceOrder = sequenceOrder;
    this.name = name;
    this.checkpointType = checkpointType;
    this.linkedStationId = options?.linkedStationId;
    this.linkedBusStopId = options?.linkedBusStopId;
    this.lineInfo = options?.lineInfo;
    this.expectedDurationToNext = options?.expectedDurationToNext;
    this.expectedWaitTime = options?.expectedWaitTime ?? 0;
    this.transportMode = options?.transportMode;
    this.createdAt = options?.createdAt || new Date();
  }

  // 이 체크포인트가 환승 관련인지 확인
  isTransferRelated(): boolean {
    return (
      this.checkpointType === CheckpointType.TRANSFER_POINT ||
      this.transportMode === TransportMode.TRANSFER
    );
  }

  // 이 구간의 총 예상 시간 (이동 + 대기)
  getTotalExpectedTime(): number {
    return (this.expectedDurationToNext || 0) + this.expectedWaitTime;
  }
}
