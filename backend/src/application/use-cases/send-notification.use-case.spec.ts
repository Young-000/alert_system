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
      findAll: jest.fn(),
      delete: jest.fn(),
    };
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateGoogleId: jest.fn(),
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
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
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

  it('should return early if alert is disabled', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '비활성 알림', '0 8 * * *', [AlertType.WEATHER]);
    alert.disable();

    alertRepository.findById.mockResolvedValue(alert);

    await useCase.execute(alert.id);

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(weatherApiClient.getWeather).not.toHaveBeenCalled();
    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('should throw error if user not found', async () => {
    const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute(alert.id)).rejects.toThrow('사용자 위치 정보를 찾을 수 없습니다.');
  });

  it('should throw error if user has no location', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(alert.id)).rejects.toThrow('사용자 위치 정보를 찾을 수 없습니다.');
  });

  it('should send notification with air quality data', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '미세먼지 알림', '0 8 * * *', [AlertType.AIR_QUALITY]);
    const airQuality = new AirQuality('서울', 45, 22, 65, '보통');
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(airQualityApiClient.getAirQuality).toHaveBeenCalledWith(37.5665, 126.9780);
    expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should send notification with bus arrival data', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '버스 알림', '0 8 * * *', [AlertType.BUS], 'bus-stop-123');
    const busArrivals = [
      new BusArrival('bus-stop-123', 'route-1', '146', 300, 5),
      new BusArrival('bus-stop-123', 'route-2', '350', 600, 10),
    ];
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    busApiClient.getBusArrival.mockResolvedValue(busArrivals);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(busApiClient.getBusArrival).toHaveBeenCalledWith('bus-stop-123');
    expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should send notification with subway arrival data', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '지하철 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'station-456');
    const station = new SubwayStation('강남', '2', 'station-456');
    const subwayArrivals = [
      new SubwayArrival('강남', '2', '외선', 3, '성수'),
      new SubwayArrival('강남', '2', '내선', 5, '신도림'),
    ];
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(subwayStationRepository.findById).toHaveBeenCalledWith('station-456');
    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalledWith('강남');
    expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should send notification with all alert types', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(
      user.id,
      '종합 알림',
      '0 8 * * *',
      [AlertType.WEATHER, AlertType.AIR_QUALITY, AlertType.BUS, AlertType.SUBWAY],
      'bus-stop-123',
      'station-456',
    );
    const weather = new Weather('Seoul', 20, 'Sunny', 50, 5);
    const airQuality = new AirQuality('서울', 30, 15, 45, '좋음');
    const busArrivals = [new BusArrival('bus-stop-123', 'route-1', '146', 300, 5)];
    const station = new SubwayStation('강남', '2', 'station-456');
    const subwayArrivals = [new SubwayArrival('강남', '2', '외선', 3, '성수')];
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeather.mockResolvedValue(weather);
    airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);
    busApiClient.getBusArrival.mockResolvedValue(busArrivals);
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeather).toHaveBeenCalled();
    expect(airQualityApiClient.getAirQuality).toHaveBeenCalled();
    expect(busApiClient.getBusArrival).toHaveBeenCalled();
    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalled();
    expect(pushNotificationService.sendNotification).toHaveBeenCalled();
  });

  it('should return early if no push subscriptions', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeather.mockResolvedValue(weather);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([]);

    await useCase.execute(alert.id);

    expect(pushNotificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('should send to multiple subscriptions', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);
    const subscriptions = [
      new PushSubscription(user.id, 'https://example.com/push1', { p256dh: 'key1', auth: 'auth1' }),
      new PushSubscription(user.id, 'https://example.com/push2', { p256dh: 'key2', auth: 'auth2' }),
      new PushSubscription(user.id, 'https://example.com/push3', { p256dh: 'key3', auth: 'auth3' }),
    ];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeather.mockResolvedValue(weather);
    pushSubscriptionRepository.findByUserId.mockResolvedValue(subscriptions);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(pushNotificationService.sendNotification).toHaveBeenCalledTimes(3);
  });

  it('should not call subway API if station not found', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '지하철 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'invalid-station');
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayStationRepository.findById.mockResolvedValue(undefined);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(subwayStationRepository.findById).toHaveBeenCalledWith('invalid-station');
    expect(subwayApiClient.getSubwayArrival).not.toHaveBeenCalled();
  });

  it('should not call bus API if no busStopId configured', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '버스 알림', '0 8 * * *', [AlertType.BUS]); // no busStopId
    const subscription = new PushSubscription(user.id, 'https://example.com/push', {
      p256dh: 'key1',
      auth: 'key2',
    });

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    pushSubscriptionRepository.findByUserId.mockResolvedValue([subscription]);
    pushNotificationService.sendNotification.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(busApiClient.getBusArrival).not.toHaveBeenCalled();
  });

  it('should include correct notification payload', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Rain', 80, 5);
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

    expect(pushNotificationService.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://example.com/push', keys: { p256dh: 'key1', auth: 'key2' } },
      expect.stringContaining('출근 알림'),
    );
  });

  it('should format notification body with rain weather', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '날씨 알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 18, 'Heavy Rain', 90, 15);
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

    const callArg = pushNotificationService.sendNotification.mock.calls[0][1];
    expect(callArg).toContain('rain');
    expect(callArg).toContain('18');
  });
});
