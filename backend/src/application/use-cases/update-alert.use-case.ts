import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Alert } from '@domain/entities/alert.entity';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

@Injectable()
export class UpdateAlertUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('INotificationScheduler')
    private notificationScheduler: INotificationScheduler,
  ) {}

  async execute(alertId: string, dto: UpdateAlertDto): Promise<Alert> {
    const existingAlert = await this.alertRepository.findById(alertId);
    if (!existingAlert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    // Track if we need to reschedule
    const wasEnabled = existingAlert.enabled;
    const scheduleChanged = dto.schedule && dto.schedule !== existingAlert.schedule;

    // Update alert properties
    if (dto.name !== undefined) {
      (existingAlert as any).name = dto.name;
    }
    if (dto.schedule !== undefined) {
      (existingAlert as any).schedule = dto.schedule;
    }
    if (dto.alertTypes !== undefined) {
      existingAlert.alertTypes = dto.alertTypes;
    }
    if (dto.enabled !== undefined) {
      if (dto.enabled) {
        existingAlert.enable();
      } else {
        existingAlert.disable();
      }
    }
    if (dto.busStopId !== undefined) {
      (existingAlert as any).busStopId = dto.busStopId;
    }
    if (dto.subwayStationId !== undefined) {
      (existingAlert as any).subwayStationId = dto.subwayStationId;
    }

    await this.alertRepository.save(existingAlert);

    // Handle scheduling changes
    if (existingAlert.enabled) {
      if (!wasEnabled || scheduleChanged) {
        // Schedule new notification if just enabled or schedule changed
        await this.notificationScheduler.scheduleNotification(existingAlert);
      }
    } else if (wasEnabled) {
      // Cancel notification if just disabled
      await this.notificationScheduler.cancelNotification(alertId);
    }

    return existingAlert;
  }
}
