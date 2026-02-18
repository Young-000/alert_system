import { SmartDepartureSnapshot } from '@domain/entities/smart-departure-snapshot.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';

export interface ISmartDepartureSnapshotRepository {
  save(snapshot: SmartDepartureSnapshot): Promise<SmartDepartureSnapshot>;
  findById(id: string): Promise<SmartDepartureSnapshot | undefined>;
  findBySettingAndDate(
    settingId: string,
    date: string,
  ): Promise<SmartDepartureSnapshot | undefined>;
  findTodayByUserId(userId: string): Promise<SmartDepartureSnapshot[]>;
  findTodayByUserAndType(
    userId: string,
    departureType: DepartureType,
  ): Promise<SmartDepartureSnapshot | undefined>;
  findByUserIdInDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<SmartDepartureSnapshot[]>;
  update(snapshot: SmartDepartureSnapshot): Promise<void>;
  expireOldSnapshots(beforeDate: string): Promise<number>;
}

export const SMART_DEPARTURE_SNAPSHOT_REPOSITORY = Symbol(
  'ISmartDepartureSnapshotRepository',
);
