import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ALTERNATIVE_MAPPING_REPOSITORY,
  IAlternativeMappingRepository,
} from '@domain/repositories/alternative-mapping.repository';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import {
  DelaySegmentDto,
  AlternativeSuggestionDto,
  AlternativeStepDto,
  AlternativeConfidence,
} from '@application/dto/delay-status.dto';

const DELAY_THRESHOLD_FOR_ALTERNATIVE = 5; // Only suggest alternatives for delays >= 5 minutes

@Injectable()
export class AlternativeSuggestionService {
  private readonly logger = new Logger(AlternativeSuggestionService.name);

  constructor(
    @Inject(ALTERNATIVE_MAPPING_REPOSITORY)
    private readonly mappingRepository: IAlternativeMappingRepository,
    @Inject('ISubwayApiClient')
    private readonly subwayApiClient: ISubwayApiClient,
  ) {}

  async findAlternatives(
    delayedSegments: DelaySegmentDto[],
  ): Promise<AlternativeSuggestionDto[]> {
    const significantDelays = delayedSegments.filter(
      (seg) => seg.delayMinutes >= DELAY_THRESHOLD_FOR_ALTERNATIVE,
    );

    if (significantDelays.length === 0) {
      return [];
    }

    const alternatives: AlternativeSuggestionDto[] = [];

    for (const segment of significantDelays) {
      const segmentAlts = await this.findAlternativesForSegment(segment);
      alternatives.push(...segmentAlts);
    }

    return alternatives;
  }

  private async findAlternativesForSegment(
    segment: DelaySegmentDto,
  ): Promise<AlternativeSuggestionDto[]> {
    const stationName = segment.checkpointName.replace(/역$/, '');
    const mappings = await this.mappingRepository.findByStationAndLine(
      stationName,
      segment.lineInfo,
    );

    if (mappings.length === 0) {
      return [];
    }

    const results: AlternativeSuggestionDto[] = [];

    for (const mapping of mappings) {
      const alt = mapping.getAlternativeFor(stationName, segment.lineInfo);
      if (!alt) continue;

      // Try to get real-time data for the alternative station
      let altWaitMinutes = 3; // Default estimated wait
      let confidence: AlternativeConfidence = 'low';

      try {
        const altArrivals = await this.subwayApiClient.getSubwayArrival(
          alt.stationName,
        );
        const matchingArrivals = altArrivals.filter((a) =>
          this.lineMatches(a.lineId, alt.line),
        );

        if (matchingArrivals.length > 0) {
          const shortestArrival = Math.min(
            ...matchingArrivals.map((a) => a.arrivalTime),
          );
          altWaitMinutes = Math.ceil(shortestArrival / 60);
          confidence = 'high';
        } else {
          confidence = 'medium';
        }
      } catch {
        this.logger.warn(
          `Failed to fetch alternative arrival data for ${alt.stationName}`,
        );
        confidence = 'low';
      }

      // Calculate time comparison
      // Current: wait at delayed station (estimatedWaitMinutes)
      // Alternative: walk to alt station + wait at alt station
      const currentWait = segment.estimatedWaitMinutes;
      const alternativeTime = alt.walkingMinutes + altWaitMinutes;
      const savingsMinutes = currentWait - alternativeTime;

      // Only suggest if alternative is actually faster
      if (savingsMinutes <= 0) continue;

      const steps: AlternativeStepDto[] = [
        {
          action: 'walk',
          from: segment.checkpointName,
          to: `${alt.stationName}역`,
          durationMinutes: alt.walkingMinutes,
        },
        {
          action: 'subway',
          from: `${alt.stationName}역`,
          line: alt.line,
          durationMinutes: altWaitMinutes,
        },
      ];

      results.push({
        id: mapping.id,
        triggerSegment: segment.checkpointId,
        triggerReason: `${segment.lineInfo} ${segment.checkpointName} ${segment.delayMinutes}분 지연`,
        description: `${alt.line} ${alt.stationName}역 경유`,
        steps,
        totalDurationMinutes: alternativeTime,
        originalDurationMinutes: currentWait,
        savingsMinutes,
        walkingDistanceMeters: alt.walkingDistanceMeters,
        confidence,
      });
    }

    return results;
  }

  private lineMatches(lineId: string, lineInfo: string): boolean {
    const lineNumber = lineInfo.match(/(\d+)/);
    if (!lineNumber) return false;

    const lineNum = parseInt(lineNumber[1], 10);
    const expectedLineId = `100${lineNum}`;
    const expectedLineIdAlt = `10${lineNum}`;

    return (
      lineId === expectedLineId ||
      lineId === expectedLineIdAlt ||
      lineId.endsWith(String(lineNum))
    );
  }
}
