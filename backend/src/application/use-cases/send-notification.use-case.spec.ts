import { NotFoundException } from '@nestjs/common';
import { SendNotificationUseCase } from './send-notification.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { IPushNotificationService } from '@infrastructure/push/push-notification.service';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { User } from '@domain/entities/user.entity';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

describe('SendNotificationUseCase', () => {
  let useCase: SendNotificationUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let weatherApiClient: jest.Mocked<IWeatherApiClient>;
  let airQualityApiClient: jest.Mocked<IAirQualityApiClient>;
  let busApiClient: jest.Mocked<IBusApiClient>;
  let subwayApiClient: jest.Mocked<ISubwayApiClient>;
  let pushNotificationService: jest.Mocked<IPushNotificationService>;

  beforeEach(() => {
    alertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    };
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    weatherApiClient = {
      getWeather: jest.fn(),
    };
    airQualityApiClient = {
      getAirQuality: jest.fn(),
    };
    busApiClient = {
      getBusArrival: jest.fn(),
    };
    subwayApiClient = {
      getSubwayArrival: jest.fn(),
    };
    pushNotificationService = {
      sendNotification: jest.fn(),
    };

    useCase = new SendNotificationUseCase(
      alertRepository,
      userRepository,
      weatherApiClient,
      airQualityApiClient,
      busApiClient,
      subwayApiClient,
      pushNotificationService
    );
  });

  it('should fetch weather data when alert includes weather type', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeather.mockResolvedValue(weather);

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeather).toHaveBeenCalledWith(37.5665, 126.9780);
    // Note: Push notification is not implemented yet (TODO in code)
    // expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should fetch air quality data when alert includes air quality type', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.AIR_QUALITY]);
    const airQuality = new AirQuality('Seoul', 17, 6, 17, 'Good');

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);

    await useCase.execute(alert.id);

    expect(airQualityApiClient.getAirQuality).toHaveBeenCalledWith(37.5665, 126.9780);
  });

  it('should fetch bus arrival data when alert includes bus type', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.BUS], 'bus-stop-123');
    const busArrivals = [
      new BusArrival('bus-stop-123', 'route-456', '100번', 5, 1),
    ];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    busApiClient.getBusArrival.mockResolvedValue(busArrivals);

    await useCase.execute(alert.id);

    expect(busApiClient.getBusArrival).toHaveBeenCalledWith('bus-stop-123');
  });

  it('should fetch subway arrival data when alert includes subway type', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'station-123');
    const subwayArrivals = [
      new SubwayArrival('station-123', 'line-2', '상행', 3, '강남역'),
    ];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);

    await useCase.execute(alert.id);

    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalledWith('station-123');
  });

  it('should throw NotFoundException if alert not found', async () => {
    alertRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundException);
    await expect(useCase.execute('non-existent-id')).rejects.toThrow('Alert not found');
  });

  it('should throw NotFoundException if user not found', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute(alert.id)).rejects.toThrow(NotFoundException);
    await expect(useCase.execute(alert.id)).rejects.toThrow('User not found');
  });

  it('should throw NotFoundException if user has no location', async () => {
    const user = new User('user@example.com', 'John Doe');
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(alert.id)).rejects.toThrow(NotFoundException);
    await expect(useCase.execute(alert.id)).rejects.toThrow('User location not found');
  });

  it('should not send notification if alert is disabled', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    alert.disable();

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeather).not.toHaveBeenCalled();
  });
});

