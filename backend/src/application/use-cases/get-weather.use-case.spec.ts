import { NotFoundException } from '@nestjs/common';
import { GetWeatherUseCase } from './get-weather.use-case';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { Weather } from '@domain/entities/weather.entity';

describe('GetWeatherUseCase', () => {
  let useCase: GetWeatherUseCase;
  let weatherApiClient: jest.Mocked<IWeatherApiClient>;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    weatherApiClient = {
      getWeather: jest.fn(),
    };
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new GetWeatherUseCase(weatherApiClient, userRepository);
  });

  describe('execute', () => {
    it('should get weather for user with location', async () => {
      const user = new User('user@example.com', 'John Doe', {
        address: 'Seoul',
        lat: 37.5665,
        lng: 126.9780,
      });
      const weather = new Weather('Seoul', 15, 'Clear', 60, 10);

      userRepository.findById.mockResolvedValue(user);
      weatherApiClient.getWeather.mockResolvedValue(weather);

      const result = await useCase.execute(user.id);

      expect(result).toEqual(weather);
      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
      expect(weatherApiClient.getWeather).toHaveBeenCalledWith(37.5665, 126.9780);
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
    it('should get weather by location', async () => {
      const weather = new Weather('Seoul', 15, 'Clear', 60, 10);
      weatherApiClient.getWeather.mockResolvedValue(weather);

      const result = await useCase.executeByLocation(37.5665, 126.9780);

      expect(result).toEqual(weather);
      expect(weatherApiClient.getWeather).toHaveBeenCalledWith(37.5665, 126.9780);
    });
  });
});
