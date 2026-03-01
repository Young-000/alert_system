import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SegmentCongestionEntity } from '../typeorm/segment-congestion.entity';
import { ISegmentCongestionRepository } from '@domain/repositories/segment-congestion.repository';
import {
  SegmentCongestion,
  TimeSlot,
  CongestionLevel,
} from '@domain/entities/segment-congestion.entity';

@Injectable()
export class SegmentCongestionRepositoryImpl implements ISegmentCongestionRepository {
  constructor(
    @InjectRepository(SegmentCongestionEntity)
    private readonly repository: Repository<SegmentCongestionEntity>,
  ) {}

  async findBySegmentKeyAndTimeSlot(
    segmentKey: string,
    timeSlot: TimeSlot,
  ): Promise<SegmentCongestion | null> {
    const entity = await this.repository.findOne({
      where: { segmentKey, timeSlot },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByTimeSlot(
    timeSlot: TimeSlot,
    options?: { level?: CongestionLevel; limit?: number },
  ): Promise<SegmentCongestion[]> {
    const where: Record<string, unknown> = { timeSlot };
    if (options?.level) {
      where['congestionLevel'] = options.level;
    }

    const entities = await this.repository.find({
      where,
      order: { avgDelayMinutes: 'DESC' },
      take: options?.limit ?? 50,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findBySegmentKeys(
    segmentKeys: string[],
    timeSlot?: TimeSlot,
  ): Promise<SegmentCongestion[]> {
    if (segmentKeys.length === 0) return [];

    const where: Record<string, unknown> = {
      segmentKey: In(segmentKeys),
    };
    if (timeSlot) {
      where['timeSlot'] = timeSlot;
    }

    const entities = await this.repository.find({ where });
    return entities.map((e) => this.toDomain(e));
  }

  async save(congestion: SegmentCongestion): Promise<SegmentCongestion> {
    const entity = this.toEntity(congestion);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async saveMany(congestions: SegmentCongestion[]): Promise<void> {
    if (congestions.length === 0) return;

    const entities = congestions.map((c) => this.toEntity(c));
    // Use chunks of 100 to avoid parameter limit
    const chunkSize = 100;
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      await this.repository.save(chunk);
    }
  }

  async deleteAll(): Promise<void> {
    await this.repository.clear();
  }

  async countAll(): Promise<number> {
    return this.repository.count();
  }

  private toDomain(entity: SegmentCongestionEntity): SegmentCongestion {
    return new SegmentCongestion({
      id: entity.id,
      segmentKey: entity.segmentKey,
      checkpointName: entity.checkpointName,
      checkpointType: entity.checkpointType,
      lineInfo: entity.lineInfo,
      linkedStationId: entity.linkedStationId,
      linkedBusStopId: entity.linkedBusStopId,
      timeSlot: entity.timeSlot as TimeSlot,
      avgWaitMinutes: entity.avgWaitMinutes,
      avgDelayMinutes: entity.avgDelayMinutes,
      stdDevMinutes: entity.stdDevMinutes,
      sampleCount: entity.sampleCount,
      congestionLevel: entity.congestionLevel as CongestionLevel,
      confidence: entity.confidence,
      lastUpdatedAt: entity.lastUpdatedAt,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(congestion: SegmentCongestion): SegmentCongestionEntity {
    const entity = new SegmentCongestionEntity();
    if (congestion.id) entity.id = congestion.id;
    entity.segmentKey = congestion.segmentKey;
    entity.checkpointName = congestion.checkpointName;
    entity.checkpointType = congestion.checkpointType;
    entity.lineInfo = congestion.lineInfo;
    entity.linkedStationId = congestion.linkedStationId;
    entity.linkedBusStopId = congestion.linkedBusStopId;
    entity.timeSlot = congestion.timeSlot;
    entity.avgWaitMinutes = congestion.avgWaitMinutes;
    entity.avgDelayMinutes = congestion.avgDelayMinutes;
    entity.stdDevMinutes = congestion.stdDevMinutes;
    entity.sampleCount = congestion.sampleCount;
    entity.congestionLevel = congestion.congestionLevel;
    entity.confidence = congestion.confidence;
    entity.lastUpdatedAt = congestion.lastUpdatedAt;
    return entity;
  }
}
