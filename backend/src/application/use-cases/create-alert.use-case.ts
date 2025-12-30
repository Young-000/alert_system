import { Inject, NotFoundException } from '@nestjs/common';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { Alert } from '@domain/entities/alert.entity';
import { CreateAlertDto } from '../dto/create-alert.dto';

export class CreateAlertUseCase {
  constructor(
    @Inject('IAlertRepository') private alertRepository: IAlertRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async execute(dto: CreateAlertDto): Promise<Alert> {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alert = new Alert(
      dto.userId,
      dto.name,
      dto.schedule,
      dto.alertTypes,
      dto.busStopId,
      dto.subwayStationId
    );
    await this.alertRepository.save(alert);
    return alert;
  }
}

