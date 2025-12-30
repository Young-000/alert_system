import { Inject, NotFoundException } from '@nestjs/common';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { Weather } from '@domain/entities/weather.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

export class GetWeatherUseCase {
  constructor(
    @Inject('IWeatherApiClient') private weatherApiClient: IWeatherApiClient,
    @Inject('IUserRepository') private userRepository: IUserRepository
  ) {}

  async execute(userId: string): Promise<Weather> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.location) {
      throw new NotFoundException('User location not found');
    }

    return this.weatherApiClient.getWeather(
      user.location.lat,
      user.location.lng
    );
  }

  async executeByLocation(lat: number, lng: number): Promise<Weather> {
    return this.weatherApiClient.getWeather(lat, lng);
  }
}
