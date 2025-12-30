import { NotFoundException } from '@nestjs/common';
import { GetAirQualityUseCase } from './get-air-quality.use-case';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';

describe('GetAirQualityUseCase', () => {
  let useCase: GetAirQualityUseCase;
  let airQualityApiClient: jest.Mocked<IAirQualityApiClient>;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    airQualityApiClient = {
      getAirQuality: jest.fn(),
    };
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new GetAirQualityUseCase(airQualityApiClient, userRepository);
  });

  describe('execute', () => {
    it('should get air quality for user with location', async () => {
      const user = new User('user@example.com', 'John Doe', {
        address: 'Seoul',
        lat: 37.5665,
        lng: 126.9780,
      });
      const airQuality = new AirQuality('Seoul', 17, 6, 17, 'Good');

      userRepository.findById.mockResolvedValue(user);
      airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);

      const result = await useCase.execute(user.id);

      expect(result).toEqual(airQuality);
      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
      expect(airQualityApiClient.getAirQuality).toHaveBeenCalledWith(37.5665, 126.9780);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(undefined);

      await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(useCase.execute('non-existent-id')).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException if user has no location', async () => {
      const user = new User('user@example.com', 'John Doe');
      userRepository.findById.mockResolvedValue(user);

      await expect(useCase.execute(user.id)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(user.id)).rejects.toThrow('User location not found');
    });
  });

  describe('executeByLocation', () => {
    it('should get air quality by location', async () => {
      const airQuality = new AirQuality('Seoul', 17, 6, 17, 'Good');
      airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);

      const result = await useCase.executeByLocation(37.5665, 126.9780);

      expect(result).toEqual(airQuality);
      expect(airQualityApiClient.getAirQuality).toHaveBeenCalledWith(37.5665, 126.9780);
    });
  });
});
