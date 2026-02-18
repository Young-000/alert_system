import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartDepartureSettingEntity } from '../typeorm/smart-departure-setting.entity';
import { ISmartDepartureSettingRepository } from '@domain/repositories/smart-departure-setting.repository';
import { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';

@Injectable()
export class SmartDepartureSettingRepositoryImpl
  implements ISmartDepartureSettingRepository
{
  constructor(
    @InjectRepository(SmartDepartureSettingEntity)
    private readonly repo: Repository<SmartDepartureSettingEntity>,
  ) {}

  async save(setting: SmartDepartureSetting): Promise<SmartDepartureSetting> {
    const entity = this.toEntity(setting);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<SmartDepartureSetting | undefined> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string): Promise<SmartDepartureSetting[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserIdAndType(
    userId: string,
    departureType: DepartureType,
  ): Promise<SmartDepartureSetting | undefined> {
    const entity = await this.repo.findOne({
      where: { userId, departureType },
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findActiveByUserId(userId: string): Promise<SmartDepartureSetting[]> {
    const entities = await this.repo.find({
      where: { userId, isEnabled: true },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findAllActive(): Promise<SmartDepartureSetting[]> {
    const entities = await this.repo.find({
      where: { isEnabled: true },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async update(setting: SmartDepartureSetting): Promise<void> {
    const entity = this.toEntity(setting);
    await this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toEntity(setting: SmartDepartureSetting): SmartDepartureSettingEntity {
    const entity = new SmartDepartureSettingEntity();
    if (setting.id) entity.id = setting.id;
    entity.userId = setting.userId;
    entity.routeId = setting.routeId;
    entity.departureType = setting.departureType;
    entity.arrivalTarget = setting.arrivalTarget;
    entity.prepTimeMinutes = setting.prepTimeMinutes;
    entity.isEnabled = setting.isEnabled;
    entity.activeDays = setting.activeDays.join(',');
    entity.preAlerts = setting.preAlerts.join(',');
    return entity;
  }

  private toDomain(entity: SmartDepartureSettingEntity): SmartDepartureSetting {
    return new SmartDepartureSetting(
      entity.userId,
      entity.routeId,
      entity.departureType as DepartureType,
      this.normalizeTimeField(entity.arrivalTarget),
      {
        id: entity.id,
        prepTimeMinutes: entity.prepTimeMinutes,
        isEnabled: entity.isEnabled,
        activeDays: this.parseIntArray(entity.activeDays),
        preAlerts: this.parseIntArray(entity.preAlerts),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    );
  }

  /**
   * PostgreSQL TIME type may return 'HH:mm:ss' format.
   * Normalize to 'HH:mm'.
   */
  private normalizeTimeField(time: string): string {
    if (!time) return '00:00';
    // If already HH:mm, return as-is
    if (/^\d{2}:\d{2}$/.test(time)) return time;
    // If HH:mm:ss, strip seconds
    const match = time.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : time;
  }

  private parseIntArray(value: string): number[] {
    if (!value || value === '') return [];
    return value.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
  }
}
