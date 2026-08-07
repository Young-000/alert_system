import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartDepartureSnapshotEntity } from '../typeorm/smart-departure-snapshot.entity';
import { ISmartDepartureSnapshotRepository } from '@domain/repositories/smart-departure-snapshot.repository';
import { SmartDepartureSnapshot } from '@domain/entities/smart-departure-snapshot.entity';
import type { SnapshotStatus } from '@domain/entities/smart-departure-snapshot.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';
import { getTodayKST, toDateOnlyKST } from '@domain/utils/kst-date';

@Injectable()
export class SmartDepartureSnapshotRepositoryImpl
  implements ISmartDepartureSnapshotRepository
{
  constructor(
    @InjectRepository(SmartDepartureSnapshotEntity)
    private readonly repo: Repository<SmartDepartureSnapshotEntity>,
  ) {}

  async save(snapshot: SmartDepartureSnapshot): Promise<SmartDepartureSnapshot> {
    const entity = this.toEntity(snapshot);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<SmartDepartureSnapshot | undefined> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findBySettingAndDate(
    settingId: string,
    date: string,
  ): Promise<SmartDepartureSnapshot | undefined> {
    const entity = await this.repo.findOne({
      where: { settingId, departureDate: date },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findTodayByUserId(userId: string): Promise<SmartDepartureSnapshot[]> {
    const today = this.getTodayDateString();
    const entities = await this.repo.find({
      where: { userId, departureDate: today },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findTodayByUserAndType(
    userId: string,
    departureType: DepartureType,
  ): Promise<SmartDepartureSnapshot | undefined> {
    const today = this.getTodayDateString();
    const entity = await this.repo.findOne({
      where: { userId, departureType, departureDate: today },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserIdInDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<SmartDepartureSnapshot[]> {
    const entities = await this.repo
      .createQueryBuilder('snapshot')
      .where('snapshot.user_id = :userId', { userId })
      .andWhere('snapshot.departure_date >= :startDate', { startDate })
      .andWhere('snapshot.departure_date <= :endDate', { endDate })
      .orderBy('snapshot.departure_date', 'DESC')
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async update(snapshot: SmartDepartureSnapshot): Promise<void> {
    const entity = this.toEntity(snapshot);
    await this.repo.save(entity);
  }

  async expireOldSnapshots(beforeDate: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(SmartDepartureSnapshotEntity)
      .set({ status: 'expired' })
      .where('departure_date < :beforeDate', { beforeDate })
      .andWhere('status IN (:...activeStatuses)', {
        activeStatuses: ['scheduled', 'notified'],
      })
      .execute();

    return result.affected ?? 0;
  }

  private toEntity(snapshot: SmartDepartureSnapshot): SmartDepartureSnapshotEntity {
    const entity = new SmartDepartureSnapshotEntity();
    if (snapshot.id) entity.id = snapshot.id;
    entity.userId = snapshot.userId;
    entity.settingId = snapshot.settingId;
    entity.departureDate = snapshot.departureDate;
    entity.departureType = snapshot.departureType;
    entity.arrivalTarget = snapshot.arrivalTarget;
    entity.estimatedTravelMin = snapshot.estimatedTravelMin;
    entity.prepTimeMinutes = snapshot.prepTimeMinutes;
    entity.optimalDepartureAt = snapshot.optimalDepartureAt;
    entity.baselineTravelMin = snapshot.baselineTravelMin;
    entity.historyAvgTravelMin = snapshot.historyAvgTravelMin;
    entity.realtimeAdjustmentMin = snapshot.realtimeAdjustmentMin;
    entity.status = snapshot.status;
    entity.alertsSent = snapshot.alertsSent.map(String);
    entity.departedAt = snapshot.departedAt;
    entity.scheduleIds = [...snapshot.scheduleIds];
    entity.calculatedAt = snapshot.calculatedAt;
    return entity;
  }

  private toDomain(entity: SmartDepartureSnapshotEntity): SmartDepartureSnapshot {
    return new SmartDepartureSnapshot(
      entity.userId,
      entity.settingId,
      this.normalizeDateField(entity.departureDate),
      entity.departureType as DepartureType,
      this.normalizeTimeField(entity.arrivalTarget),
      entity.estimatedTravelMin,
      entity.prepTimeMinutes,
      entity.optimalDepartureAt,
      {
        id: entity.id,
        baselineTravelMin: entity.baselineTravelMin,
        historyAvgTravelMin: entity.historyAvgTravelMin,
        realtimeAdjustmentMin: entity.realtimeAdjustmentMin,
        status: entity.status as SnapshotStatus,
        alertsSent: this.parseIntArray(entity.alertsSent),
        departedAt: entity.departedAt,
        scheduleIds: this.parseStringArray(entity.scheduleIds),
        calculatedAt: entity.calculatedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    );
  }

  private getTodayDateString(): string {
    return getTodayKST();
  }

  private normalizeTimeField(time: string): string {
    if (!time) return '00:00';
    if (/^\d{2}:\d{2}$/.test(time)) return time;
    const match = time.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : time;
  }

  /**
   * PostgreSQL DATE type may return a Date object or string.
   * Normalize to 'YYYY-MM-DD'. Date인 경우 KST 달력 날짜로 환산해야
   * KST 00:00~08:59에 전날로 밀리지 않는다.
   */
  private normalizeDateField(date: string | Date): string {
    return toDateOnlyKST(date);
  }

  /** simple-array 하이드레이션 결과(string[])를 숫자 배열로. 빈 문자열 요소는 걸러낸다. */
  private parseIntArray(value: string[] | null | undefined): number[] {
    return (value ?? [])
      .map((v) => parseInt(String(v).trim(), 10))
      .filter((n) => !isNaN(n));
  }

  private parseStringArray(value: string[] | null | undefined): string[] {
    return (value ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
}
