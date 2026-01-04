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
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { PushSubscription } from '@domain/entities/push-subscription.entity';
import { SubwayStation } from '@domain/entities/subway-station.entity';

describe('SendNotificationUseCase', () => {
  let useCase: SendNotificationUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let weatherApiClient: jest.Mocked<IWeatherApiClient>;
  let airQualityApiClient: jest.Mocked<IAirQualityApiClient>;
  let busApiClient: jest.Mocked<IBusApiClient>;
  let subwayApiClient: jest.Mocked<ISubwayApiClient>;
  let pushNotificationService: jest.Mocked<IPushNotificationService>;
  let pushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository>;
  let subwayStationRepository: jest.Mocked<ISubwayStationRepository>;

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
    pushSubscriptionRepository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
    };
    subwayStationRepository = {
      findById: jest.fn(),
      searchByName: jest.fn(),
      saveMany: jest.fn(),
    };

    useCase = new SendNotificationUseCase(
      alertRepository,
      userRepository,
      weatherApiClient,
      airQualityApiClient,
      busApiClient,
      subwayApiClient,
      pushNotificationService,
      pushSubscriptionRepository,
      subwayStationRepository
    );
  });

  it('should send notification with weather data', async () => {
    const user = new User('user@example.com', 'John Doe', {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeather.mockResolvedValue(weather);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeather).toHaveBeenCalledWith(37.5665, 126.9780);
    expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should throw error if alert not found', async () => {
    alertRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow('알림을 찾을 수 없습니다.');
  });
});
