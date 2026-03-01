import { Injectable, Inject, Logger } from '@nestjs/common';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { CommuteRoute, CheckpointType, RouteCheckpoint } from '@domain/entities/commute-route.entity';
import {
  DelaySegmentDto,
  SegmentDelayStatus,
  OverallDelayStatus,
} from '@application/dto/delay-status.dto';

export interface DelayCheckResult {
  segments: DelaySegmentDto[];
  overallStatus: OverallDelayStatus;
  totalExpectedDuration: number;
  totalEstimatedDuration: number;
  totalDelayMinutes: number;
}

@Injectable()
export class RouteDelayCheckService {
  private readonly logger = new Logger(RouteDelayCheckService.name);

  constructor(
    @Inject('ISubwayApiClient')
    private readonly subwayApiClient: ISubwayApiClient,
  ) {}

  async checkRouteDelays(route: CommuteRoute): Promise<DelayCheckResult> {
    const transitCheckpoints = this.getTransitCheckpoints(route);

    if (transitCheckpoints.length === 0) {
      return {
        segments: [],
        overallStatus: 'normal',
        totalExpectedDuration: route.totalExpectedDuration || 0,
        totalEstimatedDuration: route.totalExpectedDuration || 0,
        totalDelayMinutes: 0,
      };
    }

    // Fetch real-time arrival data for all transit checkpoints in parallel
    const segmentResults = await Promise.all(
      transitCheckpoints.map((cp) => this.checkCheckpointDelay(cp)),
    );

    const totalDelayMinutes = segmentResults.reduce(
      (sum, seg) => sum + Math.max(0, seg.delayMinutes),
      0,
    );
    const totalExpectedDuration = route.totalExpectedDuration || 0;
    const totalEstimatedDuration = totalExpectedDuration + totalDelayMinutes;
    const overallStatus = this.calculateOverallStatus(segmentResults);

    return {
      segments: segmentResults,
      overallStatus,
      totalExpectedDuration,
      totalEstimatedDuration,
      totalDelayMinutes,
    };
  }

  private getTransitCheckpoints(route: CommuteRoute): RouteCheckpoint[] {
    return route.checkpoints.filter(
      (cp) =>
        cp.checkpointType === CheckpointType.SUBWAY ||
        cp.checkpointType === CheckpointType.TRANSFER_POINT,
    );
  }

  private async checkCheckpointDelay(
    checkpoint: RouteCheckpoint,
  ): Promise<DelaySegmentDto> {
    const now = new Date().toISOString();
    const stationName = checkpoint.name.replace(/역$/, '');

    try {
      const arrivals = await this.subwayApiClient.getSubwayArrival(stationName);

      // Find the best matching arrival for this checkpoint's line
      const matchingArrivals = arrivals.filter((a) => {
        if (!checkpoint.lineInfo) return true;
        // Match by line info (e.g., "2호선" matches lineId patterns)
        return this.lineMatches(a.lineId, checkpoint.lineInfo);
      });

      if (matchingArrivals.length === 0) {
        // No matching arrivals found - return estimated data
        return {
          checkpointId: checkpoint.id,
          checkpointName: checkpoint.name,
          checkpointType: checkpoint.checkpointType,
          lineInfo: checkpoint.lineInfo || '',
          status: 'normal',
          expectedWaitMinutes: checkpoint.expectedWaitTime,
          estimatedWaitMinutes: checkpoint.expectedWaitTime,
          delayMinutes: 0,
          source: 'estimated',
          lastUpdated: now,
        };
      }

      // Get the shortest arrival time (in seconds, convert to minutes)
      const shortestArrivalSeconds = Math.min(
        ...matchingArrivals.map((a) => a.arrivalTime),
      );
      const estimatedWaitMinutes = Math.ceil(shortestArrivalSeconds / 60);
      const expectedWaitMinutes = checkpoint.expectedWaitTime;
      const delayMinutes = Math.max(0, estimatedWaitMinutes - expectedWaitMinutes);
      const status = this.categorizeDelay(delayMinutes);

      return {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        checkpointType: checkpoint.checkpointType,
        lineInfo: checkpoint.lineInfo || '',
        status,
        expectedWaitMinutes,
        estimatedWaitMinutes,
        delayMinutes,
        source: 'realtime_api',
        lastUpdated: now,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch arrival data for ${checkpoint.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        checkpointType: checkpoint.checkpointType,
        lineInfo: checkpoint.lineInfo || '',
        status: 'unavailable',
        expectedWaitMinutes: checkpoint.expectedWaitTime,
        estimatedWaitMinutes: checkpoint.expectedWaitTime,
        delayMinutes: 0,
        source: 'estimated',
        lastUpdated: now,
      };
    }
  }

  private lineMatches(lineId: string, lineInfo: string): boolean {
    // lineId from API is like "1001" for line 1, "1002" for line 2, etc.
    // lineInfo from checkpoint is like "1호선", "2호선", etc.
    const lineNumber = lineInfo.match(/(\d+)/);
    if (!lineNumber) return false;

    const lineNum = parseInt(lineNumber[1], 10);
    const expectedLineId = `100${lineNum}`;
    // Also handle 3-digit patterns for lines >= 10
    const expectedLineIdAlt = `10${lineNum}`;

    return lineId === expectedLineId || lineId === expectedLineIdAlt || lineId.endsWith(String(lineNum));
  }

  private categorizeDelay(delayMinutes: number): SegmentDelayStatus {
    if (delayMinutes < 2) return 'normal';
    if (delayMinutes < 10) return 'delayed';
    return 'severe_delay';
  }

  private calculateOverallStatus(segments: DelaySegmentDto[]): OverallDelayStatus {
    if (segments.length === 0) return 'normal';

    const hasUnavailable = segments.some((s) => s.status === 'unavailable');
    const allUnavailable = segments.every((s) => s.status === 'unavailable');

    if (allUnavailable) return 'unavailable';

    const maxDelay = Math.max(...segments.map((s) => s.delayMinutes));

    if (maxDelay >= 15) return 'severe_delay';
    if (maxDelay >= 5) return 'delayed';
    if (maxDelay >= 2 || hasUnavailable) return 'minor_delay';
    return 'normal';
  }
}
