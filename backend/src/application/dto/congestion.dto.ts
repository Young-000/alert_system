import { CongestionLevel, TimeSlot } from '@domain/entities/segment-congestion.entity';

// ========== GET /congestion/segments ==========

export interface CongestionSegmentDto {
  segmentKey: string;
  checkpointName: string;
  checkpointType: string;
  lineInfo?: string;
  timeSlot: TimeSlot;
  avgWaitMinutes: number;
  avgDelayMinutes: number;
  stdDevMinutes: number;
  sampleCount: number;
  congestionLevel: CongestionLevel;
  confidence: number;
  lastUpdatedAt: string;
}

export interface CongestionSegmentsResponseDto {
  timeSlot: TimeSlot;
  timeSlotLabel: string;
  segments: CongestionSegmentDto[];
  totalCount: number;
  lastCalculatedAt: string;
}

// ========== GET /congestion/routes/:routeId ==========

export interface RouteCongestionCheckpointDto {
  checkpointId: string;
  checkpointName: string;
  sequenceOrder: number;
  congestion: {
    segmentKey: string;
    avgWaitMinutes: number;
    avgDelayMinutes: number;
    congestionLevel: CongestionLevel;
    confidence: number;
    sampleCount: number;
  } | null;
}

export interface RouteCongestionResponseDto {
  routeId: string;
  routeName: string;
  timeSlot: TimeSlot;
  timeSlotLabel: string;
  checkpoints: RouteCongestionCheckpointDto[];
  overallCongestion: CongestionLevel;
  totalEstimatedDelay: number;
  lastCalculatedAt: string;
}

// ========== POST /congestion/recalculate ==========

export interface RecalculateResponseDto {
  status: string;
  message: string;
  segmentCount: number;
  elapsedMs: number;
}
