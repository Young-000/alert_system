import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

@Injectable()
export class GetAirQualityUseCase {
  constructor(
    @Inject('IAirQualityApiClient') private airQualityApiClient: IAirQualityApiClient,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async execute(userId: string): Promise<AirQuality> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (!user.location) {
      throw new NotFoundException('사용자 위치 정보가 설정되지 않았습니다.');
    }

    return this.airQualityApiClient.getAirQuality(
      user.location.lat,
      user.location.lng
    );
  }

  async executeByLocation(lat: number, lng: number): Promise<AirQuality> {
    return this.airQualityApiClient.getAirQuality(lat, lng);
  }
}

