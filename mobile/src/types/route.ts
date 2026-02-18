// ─── Route Form DTOs (CRUD operations) ──────────────

export type {
  RouteType,
  CheckpointType,
  TransportMode,
  CheckpointResponse,
  RouteResponse,
} from './home';

import type { CheckpointType, TransportMode, RouteType } from './home';

export type CreateCheckpointDto = {
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
  transportMode?: TransportMode;
};

export type CreateRouteDto = {
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred?: boolean;
  checkpoints: CreateCheckpointDto[];
};

export type UpdateRouteDto = {
  name?: string;
  routeType?: RouteType;
  isPreferred?: boolean;
  checkpoints?: CreateCheckpointDto[];
};
