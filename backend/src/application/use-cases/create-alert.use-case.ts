import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { Alert } from '@domain/entities/alert.entity';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

@Injectable()
export class CreateAlertUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('INotificationScheduler')
    private notificationScheduler: INotificationScheduler,
  ) {}

  async execute(dto: CreateAlertDto): Promise<Alert> {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const alert = new Alert(
      dto.userId,
      dto.name,
      dto.schedule,
      dto.alertTypes,
      dto.busStopId,
      dto.subwayStationId,
    );
    await this.alertRepository.save(alert);
    await this.notificationScheduler.scheduleNotification(alert);
    return alert;
  }
}
