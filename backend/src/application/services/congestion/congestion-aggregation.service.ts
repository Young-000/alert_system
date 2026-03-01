import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckpointRecordEntity } from '@infrastructure/persistence/typeorm/checkpoint-record.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import {
  ISegmentCongestionRepository,
  SEGMENT_CONGESTION_REPOSITORY,
} from '@domain/repositories/segment-congestion.repository';
import {
  SegmentCongestion,
  TimeSlot,
} from '@domain/entities/segment-congestion.entity';
import { BayesianPrior, updatePosterior } from '@application/services/statistics/bayesian-estimator';
import { normalizeSegmentKey } from './segment-key.util';
import { classifyTimeSlot } from './time-slot.util';

/**
 * Bayesian prior for congestion estimation.
 * mu = 3 min average delay (moderate default)
 * sigma = 5 (wide uncertainty)
 */
export const CONGESTION_PRIOR: BayesianPrior = {
  mu: 3,
  sigma: 5,
};

/**
 * Raw observation from a checkpoint record joined with its checkpoint and session.
 */
interface RawObservation {
  // From checkpoint_records
  actualWaitTime: number;
  delayMinutes: number;
  waitDelayMinutes: number;
  // From route_checkpoints
  checkpointName: string;
  checkpointType: string;
  lineInfo: string | null;
  linkedStationId: string | null;
  linkedBusStopId: string | null;
  // From commute_sessions
  sessionStartedAt: Date;
}

/**
 * Grouped data per segment key + time slot for aggregation.
 */
interface SegmentGroup {
  segmentKey: string;
  checkpointName: string;
  checkpointType: string;
  lineInfo: string | null;
  linkedStationId: string | null;
  linkedBusStopId: string | null;
  timeSlot: TimeSlot;
  waitTimes: number[];
  delayValues: number[];
}

@Injectable()
export class CongestionAggregationService {
  private readonly logger = new Logger(CongestionAggregationService.name);

  constructor(
    @InjectRepository(CheckpointRecordEntity)
    private readonly checkpointRecordRepo: Repository<CheckpointRecordEntity>,
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepo: Repository<CommuteSessionEntity>,
    @InjectRepository(RouteCheckpointEntity)
    private readonly routeCheckpointRepo: Repository<RouteCheckpointEntity>,
    @Inject(SEGMENT_CONGESTION_REPOSITORY)
    private readonly congestionRepo: ISegmentCongestionRepository,
  ) {}

  /**
   * Full recalculation: query ALL completed sessions, group by segment+time_slot,
   * apply Bayesian smoothing, save results.
   */
  async recalculateAll(): Promise<{ segmentCount: number; elapsed: number }> {
    const start = Date.now();
    this.logger.log('Starting full congestion recalculation...');

    // Step 1: Fetch raw observations
    const observations = await this.fetchAllObservations();
    this.logger.log(`Fetched ${observations.length} raw observations`);

    if (observations.length === 0) {
      await this.congestionRepo.deleteAll();
      return { segmentCount: 0, elapsed: Date.now() - start };
    }

    // Step 2: Group by segment key + time slot
    const groups = this.groupObservations(observations);
    this.logger.log(`Grouped into ${groups.size} segment+timeslot combinations`);

    // Step 3: Apply Bayesian smoothing and create congestion entries
    const congestions = this.computeCongestions(groups);
    this.logger.log(`Computed ${congestions.length} congestion entries`);

    // Step 4: Clear old data and save new
    await this.congestionRepo.deleteAll();
    await this.congestionRepo.saveMany(congestions);

    const elapsed = Date.now() - start;
    this.logger.log(`Full recalculation completed: ${congestions.length} entries in ${elapsed}ms`);

    return { segmentCount: congestions.length, elapsed };
  }

  /**
   * Incremental update: process only checkpoint records from a specific session.
   */
  async updateForSession(sessionId: string): Promise<void> {
    const observations = await this.fetchObservationsForSession(sessionId);
    if (observations.length === 0) return;

    const groups = this.groupObservations(observations);

    for (const [key, group] of groups.entries()) {
      const [segmentKey, timeSlot] = key.split('||') as [string, TimeSlot];

      // Fetch existing record
      const existing = await this.congestionRepo.findBySegmentKeyAndTimeSlot(
        segmentKey,
        timeSlot,
      );

      if (existing) {
        // Merge new observations: re-fetch all observations for this segment+slot
        // to get accurate Bayesian posterior
        const allObs = await this.fetchObservationsForSegment(segmentKey, timeSlot);
        const allGroups = this.groupObservations(allObs);
        const mergedGroup = allGroups.get(key);
        if (mergedGroup) {
          const updated = this.computeSingleCongestion(mergedGroup);
          await this.congestionRepo.save(new SegmentCongestion({
            id: existing.id,
            ...updated,
          }));
        }
      } else {
        // Create new entry
        const newEntry = this.computeSingleCongestion(group);
        await this.congestionRepo.save(new SegmentCongestion(newEntry));
      }
    }
  }

  /**
   * Fetch all observations from completed sessions.
   */
  private async fetchAllObservations(): Promise<RawObservation[]> {
    const results = await this.checkpointRecordRepo
      .createQueryBuilder('cr')
      .innerJoin(CommuteSessionEntity, 'cs', 'cr.session_id = cs.id')
      .innerJoin(RouteCheckpointEntity, 'rc', 'cr.checkpoint_id = rc.id')
      .select([
        'cr.actual_wait_time AS "actualWaitTime"',
        'cr.delay_minutes AS "delayMinutes"',
        'cr.wait_delay_minutes AS "waitDelayMinutes"',
        'rc.name AS "checkpointName"',
        'rc.checkpoint_type AS "checkpointType"',
        'rc.line_info AS "lineInfo"',
        'rc.linked_station_id AS "linkedStationId"',
        'rc.linked_bus_stop_id AS "linkedBusStopId"',
        'cs.started_at AS "sessionStartedAt"',
      ])
      .where("cs.status = 'completed'")
      .getRawMany();

    return results.map((r) => ({
      actualWaitTime: Number(r.actualWaitTime) || 0,
      delayMinutes: Number(r.delayMinutes) || 0,
      waitDelayMinutes: Number(r.waitDelayMinutes) || 0,
      checkpointName: r.checkpointName,
      checkpointType: r.checkpointType,
      lineInfo: r.lineInfo || null,
      linkedStationId: r.linkedStationId || null,
      linkedBusStopId: r.linkedBusStopId || null,
      sessionStartedAt: new Date(r.sessionStartedAt),
    }));
  }

  /**
   * Fetch observations for a specific session.
   */
  private async fetchObservationsForSession(sessionId: string): Promise<RawObservation[]> {
    const results = await this.checkpointRecordRepo
      .createQueryBuilder('cr')
      .innerJoin(CommuteSessionEntity, 'cs', 'cr.session_id = cs.id')
      .innerJoin(RouteCheckpointEntity, 'rc', 'cr.checkpoint_id = rc.id')
      .select([
        'cr.actual_wait_time AS "actualWaitTime"',
        'cr.delay_minutes AS "delayMinutes"',
        'cr.wait_delay_minutes AS "waitDelayMinutes"',
        'rc.name AS "checkpointName"',
        'rc.checkpoint_type AS "checkpointType"',
        'rc.line_info AS "lineInfo"',
        'rc.linked_station_id AS "linkedStationId"',
        'rc.linked_bus_stop_id AS "linkedBusStopId"',
        'cs.started_at AS "sessionStartedAt"',
      ])
      .where("cs.status = 'completed'")
      .andWhere('cr.session_id = :sessionId', { sessionId })
      .getRawMany();

    return results.map((r) => ({
      actualWaitTime: Number(r.actualWaitTime) || 0,
      delayMinutes: Number(r.delayMinutes) || 0,
      waitDelayMinutes: Number(r.waitDelayMinutes) || 0,
      checkpointName: r.checkpointName,
      checkpointType: r.checkpointType,
      lineInfo: r.lineInfo || null,
      linkedStationId: r.linkedStationId || null,
      linkedBusStopId: r.linkedBusStopId || null,
      sessionStartedAt: new Date(r.sessionStartedAt),
    }));
  }

  /**
   * Fetch all observations matching a specific segment key + time slot.
   */
  private async fetchObservationsForSegment(
    _segmentKey: string,
    _timeSlot: TimeSlot,
  ): Promise<RawObservation[]> {
    // For incremental updates, we re-fetch all observations and filter in memory.
    // This is acceptable since we only do this for individual segments.
    const allObs = await this.fetchAllObservations();
    return allObs.filter((obs) => {
      const key = normalizeSegmentKey({
        linkedStationId: obs.linkedStationId,
        linkedBusStopId: obs.linkedBusStopId,
        name: obs.checkpointName,
        lineInfo: obs.lineInfo,
        checkpointType: obs.checkpointType,
      });
      const slot = classifyTimeSlot(obs.sessionStartedAt);
      return key === _segmentKey && slot === _timeSlot;
    });
  }

  /**
   * Group raw observations by segment key + time slot.
   */
  private groupObservations(observations: RawObservation[]): Map<string, SegmentGroup> {
    const groups = new Map<string, SegmentGroup>();

    for (const obs of observations) {
      const segmentKey = normalizeSegmentKey({
        linkedStationId: obs.linkedStationId,
        linkedBusStopId: obs.linkedBusStopId,
        name: obs.checkpointName,
        lineInfo: obs.lineInfo,
        checkpointType: obs.checkpointType,
      });
      const timeSlot = classifyTimeSlot(obs.sessionStartedAt);
      const groupKey = `${segmentKey}||${timeSlot}`;

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          segmentKey,
          checkpointName: obs.checkpointName,
          checkpointType: obs.checkpointType,
          lineInfo: obs.lineInfo,
          linkedStationId: obs.linkedStationId,
          linkedBusStopId: obs.linkedBusStopId,
          timeSlot,
          waitTimes: [],
          delayValues: [],
        };
        groups.set(groupKey, group);
      }

      group.waitTimes.push(obs.actualWaitTime);
      group.delayValues.push(obs.delayMinutes);
    }

    return groups;
  }

  /**
   * Compute congestion entries from grouped observations using Bayesian smoothing.
   */
  private computeCongestions(groups: Map<string, SegmentGroup>): SegmentCongestion[] {
    const results: SegmentCongestion[] = [];

    for (const group of groups.values()) {
      const entry = this.computeSingleCongestion(group);
      results.push(new SegmentCongestion(entry));
    }

    return results;
  }

  /**
   * Compute a single congestion entry from a segment group.
   */
  private computeSingleCongestion(group: SegmentGroup): {
    segmentKey: string;
    checkpointName: string;
    checkpointType: string;
    lineInfo?: string;
    linkedStationId?: string;
    linkedBusStopId?: string;
    timeSlot: TimeSlot;
    avgWaitMinutes: number;
    avgDelayMinutes: number;
    stdDevMinutes: number;
    sampleCount: number;
    congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
    confidence: number;
    lastUpdatedAt: Date;
  } {
    // Apply Bayesian smoothing to delay values
    const delayPosterior = updatePosterior(CONGESTION_PRIOR, group.delayValues);

    // Calculate wait time average (simple, not Bayesian - wait times are more straightforward)
    const avgWaitMinutes = group.waitTimes.length > 0
      ? group.waitTimes.reduce((s, v) => s + v, 0) / group.waitTimes.length
      : 0;

    // Determine congestion level from Bayesian posterior
    const congestionLevel = SegmentCongestion.determineCongestionLevel(
      delayPosterior.mu,
    );

    return {
      segmentKey: group.segmentKey,
      checkpointName: group.checkpointName,
      checkpointType: group.checkpointType,
      lineInfo: group.lineInfo || undefined,
      linkedStationId: group.linkedStationId || undefined,
      linkedBusStopId: group.linkedBusStopId || undefined,
      timeSlot: group.timeSlot,
      avgWaitMinutes: Math.round(avgWaitMinutes * 100) / 100,
      avgDelayMinutes: Math.round(delayPosterior.mu * 100) / 100,
      stdDevMinutes: Math.round(delayPosterior.sigma * 100) / 100,
      sampleCount: delayPosterior.sampleCount,
      congestionLevel,
      confidence: delayPosterior.confidence,
      lastUpdatedAt: new Date(),
    };
  }
}
