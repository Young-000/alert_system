import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  ISegmentCongestionRepository,
  SEGMENT_CONGESTION_REPOSITORY,
} from '@domain/repositories/segment-congestion.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  CongestionLevel,
  TIME_SLOT_LABELS,
  TimeSlot,
} from '@domain/entities/segment-congestion.entity';
import { normalizeSegmentKey } from './segment-key.util';
import { detectCurrentTimeSlot } from './time-slot.util';
import {
  CongestionSegmentDto,
  CongestionSegmentsResponseDto,
  RouteCongestionCheckpointDto,
  RouteCongestionResponseDto,
} from '@application/dto/congestion.dto';

@Injectable()
export class CongestionService {
  private readonly logger = new Logger(CongestionService.name);

  constructor(
    @Inject(SEGMENT_CONGESTION_REPOSITORY)
    private readonly congestionRepo: ISegmentCongestionRepository,
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepo: ICommuteRouteRepository,
  ) {}

  /**
   * Get all segments for a time slot, optionally filtered by level.
   */
  async getSegments(options: {
    timeSlot?: TimeSlot;
    level?: CongestionLevel;
    limit?: number;
  }): Promise<CongestionSegmentsResponseDto> {
    const timeSlot = options.timeSlot || detectCurrentTimeSlot();
    const limit = options.limit ?? 50;

    const segments = await this.congestionRepo.findByTimeSlot(timeSlot, {
      level: options.level,
      limit,
    });

    const segmentDtos: CongestionSegmentDto[] = segments.map((s) => ({
      segmentKey: s.segmentKey,
      checkpointName: s.checkpointName,
      checkpointType: s.checkpointType,
      lineInfo: s.lineInfo,
      timeSlot: s.timeSlot,
      avgWaitMinutes: s.avgWaitMinutes,
      avgDelayMinutes: s.avgDelayMinutes,
      stdDevMinutes: s.stdDevMinutes,
      sampleCount: s.sampleCount,
      congestionLevel: s.congestionLevel,
      confidence: s.confidence,
      lastUpdatedAt: s.lastUpdatedAt.toISOString(),
    }));

    const lastCalculatedAt = segments.length > 0
      ? segments.reduce((latest, s) =>
          s.lastUpdatedAt > latest ? s.lastUpdatedAt : latest,
        segments[0].lastUpdatedAt).toISOString()
      : new Date().toISOString();

    return {
      timeSlot,
      timeSlotLabel: TIME_SLOT_LABELS[timeSlot],
      segments: segmentDtos,
      totalCount: segmentDtos.length,
      lastCalculatedAt,
    };
  }

  /**
   * Get congestion overlay for a specific route's checkpoints.
   */
  async getRouteCongestion(
    routeId: string,
    userId: string,
    timeSlot?: TimeSlot,
  ): Promise<RouteCongestionResponseDto> {
    const route = await this.routeRepo.findById(routeId);
    if (!route) {
      throw new NotFoundException('경로를 찾을 수 없습니다.');
    }

    if (route.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 경로에 접근할 수 없습니다.');
    }

    const resolvedTimeSlot = timeSlot || detectCurrentTimeSlot();

    // Build segment keys for each checkpoint
    const segmentKeys = route.checkpoints.map((cp) =>
      normalizeSegmentKey({
        linkedStationId: cp.linkedStationId,
        linkedBusStopId: cp.linkedBusStopId,
        name: cp.name,
        lineInfo: cp.lineInfo,
        checkpointType: cp.checkpointType,
      }),
    );

    const uniqueKeys = [...new Set(segmentKeys)];
    const congestionData = await this.congestionRepo.findBySegmentKeys(
      uniqueKeys,
      resolvedTimeSlot,
    );

    const congestionMap = new Map(
      congestionData.map((c) => [c.segmentKey, c]),
    );

    // Map checkpoints to congestion data
    const checkpointDtos: RouteCongestionCheckpointDto[] = route.checkpoints
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((cp, index) => {
        const segmentKey = segmentKeys[index];
        const congestion = congestionMap.get(segmentKey);

        // Skip home/work checkpoints (they typically have no transit congestion)
        const isTransitCheckpoint =
          cp.checkpointType !== 'home' && cp.checkpointType !== 'work';

        return {
          checkpointId: cp.id,
          checkpointName: cp.name,
          sequenceOrder: cp.sequenceOrder,
          congestion: congestion && isTransitCheckpoint && congestion.hasMinimumSamples()
            ? {
                segmentKey: congestion.segmentKey,
                avgWaitMinutes: congestion.avgWaitMinutes,
                avgDelayMinutes: congestion.avgDelayMinutes,
                congestionLevel: congestion.congestionLevel,
                confidence: congestion.confidence,
                sampleCount: congestion.sampleCount,
              }
            : null,
        };
      });

    // Overall congestion = worst level among all checkpoints
    const congestionLevels = checkpointDtos
      .filter((cp) => cp.congestion !== null)
      .map((cp) => cp.congestion!.congestionLevel);

    const overallCongestion = this.getWorstCongestionLevel(congestionLevels);

    // Total estimated delay = sum of all avg delays
    const totalEstimatedDelay = checkpointDtos
      .filter((cp) => cp.congestion !== null)
      .reduce((sum, cp) => sum + (cp.congestion?.avgDelayMinutes ?? 0), 0);

    const lastCalculatedAt = congestionData.length > 0
      ? congestionData.reduce((latest, c) =>
          c.lastUpdatedAt > latest ? c.lastUpdatedAt : latest,
        congestionData[0].lastUpdatedAt).toISOString()
      : new Date().toISOString();

    return {
      routeId: route.id,
      routeName: route.name,
      timeSlot: resolvedTimeSlot,
      timeSlotLabel: TIME_SLOT_LABELS[resolvedTimeSlot],
      checkpoints: checkpointDtos,
      overallCongestion,
      totalEstimatedDelay: Math.round(totalEstimatedDelay * 100) / 100,
      lastCalculatedAt,
    };
  }

  /**
   * Get the worst congestion level from a list.
   */
  private getWorstCongestionLevel(levels: CongestionLevel[]): CongestionLevel {
    if (levels.length === 0) return 'low';

    const severity: Record<CongestionLevel, number> = {
      low: 0,
      moderate: 1,
      high: 2,
      severe: 3,
    };

    const worst = levels.reduce((max, level) =>
      severity[level] > severity[max] ? level : max,
    );

    return worst;
  }
}
