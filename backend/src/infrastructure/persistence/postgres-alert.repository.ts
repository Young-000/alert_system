import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AlertEntity } from './typeorm/alert.entity';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { IAlertRepository } from '@domain/repositories/alert.repository';

@Injectable()
export class PostgresAlertRepository implements IAlertRepository {
  private repository: Repository<AlertEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repository = dataSource.getRepository(AlertEntity);
  }

  async save(alert: Alert): Promise<void> {
    const entity = this.toEntity(alert);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Alert | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  // `/alerts` 목록의 순서를 정하는 것은 이 쿼리다 — 프론트(AlertList)는 받은 배열을
  // 그대로 렌더한다. order를 빼면 Postgres가 물리적 행 순서로 돌려주므로, 알림을
  // 토글해 UPDATE가 행을 옮기는 순간 목록이 재배열돼 보인다.
  async findByUserId(userId: string): Promise<Alert[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findAll(): Promise<Alert[]> {
    const entities = await this.repository.find();
    return entities.map((entity) => this.toDomain(entity));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toEntity(alert: Alert): AlertEntity {
    const entity = new AlertEntity();
    entity.id = alert.id;
    entity.userId = alert.userId;
    entity.name = alert.name;
    entity.schedule = alert.schedule;
    entity.alertTypes = alert.alertTypes;
    entity.enabled = alert.enabled;
    entity.busStopId = alert.busStopId;
    entity.subwayStationId = alert.subwayStationId;
    entity.routeId = alert.routeId;
    return entity;
  }

  private toDomain(entity: AlertEntity): Alert {
    const alert = new Alert(
      entity.userId,
      entity.name,
      entity.schedule,
      entity.alertTypes as AlertType[],
      entity.busStopId,
      entity.subwayStationId,
      entity.id,
      false, // smartSchedulingEnabled
      undefined, // smartSchedulingConfig
      entity.routeId,
    );
    if (!entity.enabled) {
      alert.disable();
    }
    return alert;
  }
}
