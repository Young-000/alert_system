import { DataSource, Repository } from 'typeorm';
import { AlertEntity } from './typeorm/alert.entity';
import { AlertAlertTypeEntity, AlertTypeEnum } from './typeorm/alert-alert-type.entity';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { IAlertRepository } from '@domain/repositories/alert.repository';

export class PostgresAlertRepository implements IAlertRepository {
  private repository: Repository<AlertEntity>;
  private alertTypeRepository: Repository<AlertAlertTypeEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(AlertEntity);
    this.alertTypeRepository = dataSource.getRepository(AlertAlertTypeEntity);
  }

  async save(alert: Alert): Promise<void> {
    const entity = this.toEntity(alert);
    const savedEntity = await this.repository.save(entity);
    
    // Delete existing alert types
    await this.alertTypeRepository.delete({ alertId: savedEntity.id });
    
    // Save new alert types
    const alertTypes = alert.alertTypes.map((type) => {
      const alertTypeEntity = new AlertAlertTypeEntity();
      alertTypeEntity.alertId = savedEntity.id;
      alertTypeEntity.alertType = type as unknown as AlertTypeEnum;
      return alertTypeEntity;
    });
    
    if (alertTypes.length > 0) {
      await this.alertTypeRepository.save(alertTypes);
    }
  }

  async findById(id: string): Promise<Alert | undefined> {
    const entity = await this.repository.findOne({ 
      where: { id },
      relations: ['alertTypes'],
    });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findByUserId(userId: string): Promise<Alert[]> {
    const entities = await this.repository.find({ 
      where: { userId },
      relations: ['alertTypes'],
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async delete(id: string): Promise<void> {
    await this.alertTypeRepository.delete({ alertId: id });
    await this.repository.delete(id);
  }

  private toEntity(alert: Alert): AlertEntity {
    const entity = new AlertEntity();
    entity.id = alert.id;
    entity.userId = alert.userId;
    entity.name = alert.name;
    entity.schedule = alert.schedule;
    entity.enabled = alert.enabled;
    entity.busStopId = alert.busStopId;
    entity.subwayStationId = alert.subwayStationId;
    return entity;
  }

  private toDomain(entity: AlertEntity): Alert {
    const alertTypes = entity.alertTypes
      ? entity.alertTypes.map((at) => at.alertType as unknown as AlertType)
      : [];
    
    const alert = new Alert(
      entity.userId,
      entity.name,
      entity.schedule,
      alertTypes,
      entity.busStopId,
      entity.subwayStationId
    );
    (alert as any).id = entity.id;
    if (!entity.enabled) {
      alert.disable();
    }
    return alert;
  }
}

