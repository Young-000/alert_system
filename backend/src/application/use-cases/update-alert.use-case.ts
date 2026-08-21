import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

/** 스케줄러 실패 시 되돌릴 알림의 이전 상태. */
interface AlertSnapshot {
  name: string;
  schedule: string;
  alertTypes: AlertType[];
  enabled: boolean;
  busStopId?: string;
  subwayStationId?: string;
}

@Injectable()
export class UpdateAlertUseCase {
  private readonly logger = new Logger(UpdateAlertUseCase.name);

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
    const snapshot = this.snapshot(existingAlert);

    // Update alert properties
    if (dto.name !== undefined) {
      existingAlert.updateName(dto.name);
    }
    if (dto.schedule !== undefined) {
      existingAlert.updateSchedule(dto.schedule);
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
      existingAlert.busStopId = dto.busStopId;
    }
    if (dto.subwayStationId !== undefined) {
      existingAlert.subwayStationId = dto.subwayStationId;
    }

    await this.alertRepository.save(existingAlert);

    // Handle scheduling changes.
    // DB와 EventBridge를 함께 바꾸는 구간이라 CreateAlertUseCase와 같은 계약을 지킨다 —
    // 스케줄러가 실패하면 DB도 이전 상태로 되돌린다. 되돌리지 않으면 화면은 새 설정을
    // 보여주는데 실제 발송은 옛 스케줄대로 남고, 비활성화 실패의 경우 다음 수정 때
    // wasEnabled=false라 취소를 재시도조차 하지 않아 스케줄이 영구히 고아가 된다.
    try {
      if (existingAlert.enabled) {
        if (!wasEnabled || scheduleChanged) {
          // Schedule new notification if just enabled or schedule changed
          await this.notificationScheduler.scheduleNotification(existingAlert);
        }
      } else if (wasEnabled) {
        // Cancel notification if just disabled
        await this.notificationScheduler.cancelNotification(alertId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync schedule for alert ${alertId}, rolling back`,
        error,
      );
      this.restore(existingAlert, snapshot);
      await this.alertRepository.save(existingAlert);
      throw error;
    }

    return existingAlert;
  }

  private snapshot(alert: Alert): AlertSnapshot {
    return {
      name: alert.name,
      schedule: alert.schedule,
      alertTypes: [...alert.alertTypes],
      enabled: alert.enabled,
      busStopId: alert.busStopId,
      subwayStationId: alert.subwayStationId,
    };
  }

  private restore(alert: Alert, snapshot: AlertSnapshot): void {
    alert.updateName(snapshot.name);
    alert.updateSchedule(snapshot.schedule);
    alert.alertTypes = snapshot.alertTypes;
    if (snapshot.enabled) {
      alert.enable();
    } else {
      alert.disable();
    }
    alert.busStopId = snapshot.busStopId;
    alert.subwayStationId = snapshot.subwayStationId;
  }
}
