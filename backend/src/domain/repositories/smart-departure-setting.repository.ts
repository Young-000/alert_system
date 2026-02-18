import { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';

export interface ISmartDepartureSettingRepository {
  save(setting: SmartDepartureSetting): Promise<SmartDepartureSetting>;
  findById(id: string): Promise<SmartDepartureSetting | undefined>;
  findByUserId(userId: string): Promise<SmartDepartureSetting[]>;
  findByUserIdAndType(
    userId: string,
    departureType: DepartureType,
  ): Promise<SmartDepartureSetting | undefined>;
  findActiveByUserId(userId: string): Promise<SmartDepartureSetting[]>;
  findAllActive(): Promise<SmartDepartureSetting[]>;
  update(setting: SmartDepartureSetting): Promise<void>;
  delete(id: string): Promise<void>;
}

export const SMART_DEPARTURE_SETTING_REPOSITORY = Symbol(
  'ISmartDepartureSettingRepository',
);
