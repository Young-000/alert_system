import { Alert } from '../entities/alert.entity';

export interface IAlertRepository {
  save(alert: Alert): Promise<void>;
  findById(id: string): Promise<Alert | undefined>;
  findByUserId(userId: string): Promise<Alert[]>;
  findAll(): Promise<Alert[]>;
  delete(id: string): Promise<void>;
}

export class AlertRepository implements IAlertRepository {
  private alerts: Map<string, Alert> = new Map();

  async save(alert: Alert): Promise<void> {
    this.alerts.set(alert.id, alert);
  }

  async findById(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async findByUserId(userId: string): Promise<Alert[]> {
    const userAlerts: Alert[] = [];
    for (const alert of this.alerts.values()) {
      if (alert.userId === userId) {
        userAlerts.push(alert);
      }
    }
    return userAlerts;
  }

  async findAll(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async delete(id: string): Promise<void> {
    this.alerts.delete(id);
  }
}

