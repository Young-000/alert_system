export type TimeSlot =
  | 'morning_rush'
  | 'morning_late'
  | 'afternoon'
  | 'evening_rush'
  | 'evening_late'
  | 'off_peak';

export type CongestionLevel = 'low' | 'moderate' | 'high' | 'severe';

export const TIME_SLOTS: readonly TimeSlot[] = [
  'morning_rush',
  'morning_late',
  'afternoon',
  'evening_rush',
  'evening_late',
  'off_peak',
] as const;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning_rush: '오전 러시 (07:00-09:00)',
  morning_late: '오전 (09:00-11:00)',
  afternoon: '오후 (11:00-17:00)',
  evening_rush: '저녁 러시 (17:00-19:00)',
  evening_late: '저녁 (19:00-22:00)',
  off_peak: '심야/새벽 (22:00-07:00)',
};

export const CONGESTION_LEVEL_LABELS: Record<CongestionLevel, string> = {
  low: '원활',
  moderate: '보통',
  high: '혼잡',
  severe: '매우혼잡',
};

const MINIMUM_SAMPLES = 3;
const STALE_THRESHOLD_DAYS = 30;

export class SegmentCongestion {
  readonly id: string;
  readonly segmentKey: string;
  readonly checkpointName: string;
  readonly checkpointType: string;
  readonly lineInfo?: string;
  readonly linkedStationId?: string;
  readonly linkedBusStopId?: string;
  readonly timeSlot: TimeSlot;
  readonly avgWaitMinutes: number;
  readonly avgDelayMinutes: number;
  readonly stdDevMinutes: number;
  readonly sampleCount: number;
  readonly congestionLevel: CongestionLevel;
  readonly confidence: number;
  readonly lastUpdatedAt: Date;
  readonly createdAt: Date;

  constructor(options: {
    id?: string;
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
    congestionLevel: CongestionLevel;
    confidence: number;
    lastUpdatedAt?: Date;
    createdAt?: Date;
  }) {
    this.id = options.id || '';
    this.segmentKey = options.segmentKey;
    this.checkpointName = options.checkpointName;
    this.checkpointType = options.checkpointType;
    this.lineInfo = options.lineInfo;
    this.linkedStationId = options.linkedStationId;
    this.linkedBusStopId = options.linkedBusStopId;
    this.timeSlot = options.timeSlot;
    this.avgWaitMinutes = options.avgWaitMinutes;
    this.avgDelayMinutes = options.avgDelayMinutes;
    this.stdDevMinutes = options.stdDevMinutes;
    this.sampleCount = options.sampleCount;
    this.congestionLevel = options.congestionLevel;
    this.confidence = options.confidence;
    this.lastUpdatedAt = options.lastUpdatedAt || new Date();
    this.createdAt = options.createdAt || new Date();
  }

  /**
   * Determine congestion level from delay ratio and absolute delay.
   * Uses both metrics: if either qualifies for a level, that level applies (take the worse).
   */
  static determineCongestionLevel(
    avgDelayMinutes: number,
    expectedWaitTime?: number,
  ): CongestionLevel {
    const absDelay = Math.max(0, avgDelayMinutes);

    // Absolute delay level
    let absLevel: CongestionLevel = 'low';
    if (absDelay > 10) absLevel = 'severe';
    else if (absDelay > 5) absLevel = 'high';
    else if (absDelay > 2) absLevel = 'moderate';

    // Ratio-based level (only if expected wait time is provided)
    let ratioLevel: CongestionLevel = 'low';
    if (expectedWaitTime && expectedWaitTime > 0) {
      const ratio = absDelay / expectedWaitTime;
      if (ratio > 1.0) ratioLevel = 'severe';
      else if (ratio > 0.5) ratioLevel = 'high';
      else if (ratio > 0.2) ratioLevel = 'moderate';
    }

    // Take the worse of the two
    const severity: Record<CongestionLevel, number> = {
      low: 0,
      moderate: 1,
      high: 2,
      severe: 3,
    };

    return severity[absLevel] >= severity[ratioLevel] ? absLevel : ratioLevel;
  }

  /**
   * Check if this congestion data is stale (>30 days old).
   */
  isStale(): boolean {
    const daysSinceUpdate =
      (Date.now() - this.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > STALE_THRESHOLD_DAYS;
  }

  /**
   * Check if this segment has enough samples to display congestion level.
   * Below minimum threshold, show as "insufficient data".
   */
  hasMinimumSamples(): boolean {
    return this.sampleCount >= MINIMUM_SAMPLES;
  }
}
