import { SegmentCongestion, TimeSlot, CongestionLevel } from '@domain/entities/segment-congestion.entity';

export interface ISegmentCongestionRepository {
  findBySegmentKeyAndTimeSlot(
    segmentKey: string,
    timeSlot: TimeSlot,
  ): Promise<SegmentCongestion | null>;

  findByTimeSlot(
    timeSlot: TimeSlot,
    options?: { level?: CongestionLevel; limit?: number },
  ): Promise<SegmentCongestion[]>;

  findBySegmentKeys(
    segmentKeys: string[],
    timeSlot?: TimeSlot,
  ): Promise<SegmentCongestion[]>;

  save(congestion: SegmentCongestion): Promise<SegmentCongestion>;

  saveMany(congestions: SegmentCongestion[]): Promise<void>;

  deleteAll(): Promise<void>;

  countAll(): Promise<number>;
}

export const SEGMENT_CONGESTION_REPOSITORY = Symbol('ISegmentCongestionRepository');
