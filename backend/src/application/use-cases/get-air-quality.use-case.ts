import { Inject, NotFoundException } from '@nestjs/common';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

export class GetAirQualityUseCase {
  constructor(
    @Inject('IAirQualityApiClient') private airQualityApiClient: IAirQualityApiClient,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async execute(userId: string): Promise<AirQuality> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.location) {
      throw new NotFoundException('User location not found');
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

