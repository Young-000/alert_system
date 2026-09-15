import { SendNotificationUseCase } from './send-notification.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { User } from '@domain/entities/user.entity';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { SubwayStation } from '@domain/entities/subway-station.entity';
import { ISolapiService, SOLAPI_SERVICE } from '@infrastructure/messaging/solapi.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationMessageBuilderService } from '@application/services/notification-message-builder.service';

describe('SendNotificationUseCase', () => {
  let useCase: SendNotificationUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let weatherApiClient: jest.Mocked<IWeatherApiClient>;
  let airQualityApiClient: jest.Mocked<IAirQualityApiClient>;
  let busApiClient: jest.Mocked<IBusApiClient>;
  let subwayApiClient: jest.Mocked<ISubwayApiClient>;
  let subwayStationRepository: jest.Mocked<ISubwayStationRepository>;
  let solapiService: jest.Mocked<ISolapiService>;

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
      findByIds: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateGoogleId: jest.fn(),
    };
    weatherApiClient = {
      getWeather: jest.fn(),
      getWeatherWithForecast: jest.fn(),
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
    subwayStationRepository = {
      findById: jest.fn(),
      searchByName: jest.fn(),
      saveMany: jest.fn(),
    };
    solapiService = {
      sendWeatherAlert: jest.fn(),
      sendTransitAlert: jest.fn(),
      sendCombinedAlert: jest.fn(),
      sendLegacyWeatherAlert: jest.fn(),
    } as unknown as jest.Mocked<ISolapiService>;

    const messageBuilder = new NotificationMessageBuilderService();

    useCase = new SendNotificationUseCase(
      alertRepository,
      userRepository,
      weatherApiClient,
      airQualityApiClient,
      busApiClient,
      subwayApiClient,
      subwayStationRepository,
      messageBuilder,
      undefined, // routeRepository
      undefined, // recommendBestRouteUseCase
      undefined, // ruleEngine
      undefined, // smartMessageBuilder
      undefined, // ruleRepository
      solapiService,
    );
  });

  it('should throw error if alert not found', async () => {
    alertRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundException);
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
    expect(weatherApiClient.getWeatherWithForecast).not.toHaveBeenCalled();
  });

  it('should throw error if user not found', async () => {
    const alert = new Alert('user-id', '알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute(alert.id)).rejects.toThrow(NotFoundException);
  });

  it('should throw error if user has no location', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(alert.id)).rejects.toThrow(NotFoundException);
  });

  it('should send a transit-only notification when the user has no location', async () => {
    // 위치는 날씨/미세먼지 수집에만 쓰인다. 교통 전용 알림까지 위치를 요구하면
    // 위치가 없는 사용자의 알림이 매 트리거마다 예외로 끝나 DLQ로 사라진다.
    const user = new User('user@example.com', 'John Doe', '01012345678');
    const alert = new Alert(user.id, '지하철 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'station-456');
    const station = new SubwayStation('강남', '2', 'station-456');

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue([
      new SubwayArrival('강남', '2', '외선', 180, '성수'),
    ]);
    solapiService.sendTransitAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(solapiService.sendTransitAlert).toHaveBeenCalled();
    expect(weatherApiClient.getWeatherWithForecast).not.toHaveBeenCalled();
  });

  it('should still throw when a weather alert has no location to query', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.AIR_QUALITY]);
    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(alert.id)).rejects.toThrow(NotFoundException);
  });

  it('should return early if user has no phone number', async () => {
    // User 엔티티에서 phoneNumber는 필수이지만, 빈 문자열로 설정하여 알림 발송 안되는 케이스 테스트
    const user = new User('user@example.com', 'John Doe', '', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeatherWithForecast.mockResolvedValue(weather);

    await useCase.execute(alert.id);

    expect(solapiService.sendWeatherAlert).not.toHaveBeenCalled();
  });

  it('should send weather notification via Solapi', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeatherWithForecast.mockResolvedValue(weather);
    solapiService.sendWeatherAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeatherWithForecast).toHaveBeenCalledWith(37.5665, 126.9780);
    expect(solapiService.sendWeatherAlert).toHaveBeenCalled();
  });

  it('should send air quality notification', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '미세먼지 알림', '0 8 * * *', [AlertType.WEATHER, AlertType.AIR_QUALITY]);
    const weather = new Weather('Seoul', 15, 'Clear', 60, 10);
    const airQuality = new AirQuality('서울', 45, 22, 65, '보통');

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeatherWithForecast.mockResolvedValue(weather);
    airQualityApiClient.getAirQuality.mockResolvedValue(airQuality);
    solapiService.sendWeatherAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(airQualityApiClient.getAirQuality).toHaveBeenCalledWith(37.5665, 126.9780);
    expect(solapiService.sendWeatherAlert).toHaveBeenCalled();
  });

  it('should send subway notification', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '지하철 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'station-456');
    const station = new SubwayStation('강남', '2', 'station-456');
    const subwayArrivals = [
      new SubwayArrival('강남', '2', '외선', 180, '성수'),
    ];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);
    solapiService.sendTransitAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(subwayStationRepository.findById).toHaveBeenCalledWith('station-456');
    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalledWith('강남');
    expect(solapiService.sendTransitAlert).toHaveBeenCalled();
  });

  it('should send bus notification', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '버스 알림', '0 8 * * *', [AlertType.BUS], 'bus-stop-123');
    const busArrivals = [
      new BusArrival('bus-stop-123', 'route-1', '146', 300, 5),
    ];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    busApiClient.getBusArrival.mockResolvedValue(busArrivals);
    solapiService.sendTransitAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(busApiClient.getBusArrival).toHaveBeenCalledWith('bus-stop-123');
    expect(solapiService.sendTransitAlert).toHaveBeenCalled();
  });

  it('should send combined notification with weather and transit', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(
      user.id,
      '종합 알림',
      '0 8 * * *',
      [AlertType.WEATHER, AlertType.SUBWAY],
      undefined,
      'station-456',
    );
    const weather = new Weather('Seoul', 20, 'Sunny', 50, 5);
    const station = new SubwayStation('강남', '2', 'station-456');
    const subwayArrivals = [new SubwayArrival('강남', '2', '외선', 180, '성수')];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeatherWithForecast.mockResolvedValue(weather);
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);
    solapiService.sendCombinedAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    expect(weatherApiClient.getWeatherWithForecast).toHaveBeenCalled();
    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalled();
    expect(solapiService.sendCombinedAlert).toHaveBeenCalled();
  });

  it('should continue gracefully when weather API fails', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '알림', '0 8 * * *', [AlertType.WEATHER, AlertType.SUBWAY], undefined, 'station-456');
    const station = new SubwayStation('강남', '2', 'station-456');
    const subwayArrivals = [new SubwayArrival('강남', '2', '외선', 180, '성수')];

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    weatherApiClient.getWeatherWithForecast.mockRejectedValue(new Error('API Error'));
    subwayStationRepository.findById.mockResolvedValue(station);
    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);
    solapiService.sendTransitAlert.mockResolvedValue();

    await useCase.execute(alert.id);

    // Should still send transit notification even if weather fails
    expect(solapiService.sendTransitAlert).toHaveBeenCalled();
  });

  it('should not call subway API if station not found', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    });
    const alert = new Alert(user.id, '지하철 알림', '0 8 * * *', [AlertType.SUBWAY], undefined, 'invalid-station');

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);
    subwayStationRepository.findById.mockResolvedValue(undefined);

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

    alertRepository.findById.mockResolvedValue(alert);
    userRepository.findById.mockResolvedValue(user);

    await useCase.execute(alert.id);

    expect(busApiClient.getBusArrival).not.toHaveBeenCalled();
  });

  /**
   * `0 7,18 * * *`(출근+퇴근)는 웹 편집 모달이 일부러 보존하는 정식 형태다
   * (`cron-utils.ts:62` — 시각 하나만 고쳐도 나머지 시각을 지우지 않는다).
   * EventBridge도 두 시각 모두에 발화한다(`cron(0 7,18 ? * * *)`).
   *
   * 그런데 발송 경로는 크론의 **첫 시각**만 읽어 아침/저녁을 정했다. 18시 발화가
   * 아침 템플릿으로 나간다 — 같은 알림톡이 아니라 **승인된 다른 템플릿**이다.
   */
  describe('아침/저녁 템플릿 선택 (하루 두 번 울리는 알림)', () => {
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

    /** 주어진 KST 시각(시)에 발송이 일어나도록 시계를 고정한다. */
    function freezeAtKstHour(hour: number): void {
      const kstNoonBase = Date.UTC(2026, 8, 16, hour, 30) - KST_OFFSET_MS;
      jest.useFakeTimers().setSystemTime(new Date(kstNoonBase));
    }

    afterEach(() => {
      jest.useRealTimers();
    });

    async function sendWeatherAlertAt(schedule: string, kstHour: number): Promise<void> {
      const user = new User('user@example.com', 'John Doe', '01012345678', undefined, {
        address: 'Seoul',
        lat: 37.5665,
        lng: 126.978,
      });
      const alert = new Alert(user.id, '출퇴근 알림', schedule, [AlertType.WEATHER]);

      alertRepository.findById.mockResolvedValue(alert);
      userRepository.findById.mockResolvedValue(user);
      weatherApiClient.getWeatherWithForecast.mockResolvedValue(
        new Weather('Seoul', 15, 'Clear', 60, 10),
      );
      solapiService.sendWeatherAlert.mockResolvedValue();

      freezeAtKstHour(kstHour);
      await useCase.execute(alert.id);
    }

    it('18시 발화는 저녁 템플릿으로 나간다', async () => {
      await sendWeatherAlertAt('0 7,18 * * *', 18);

      expect(solapiService.sendWeatherAlert).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'evening',
      );
    });

    it('같은 알림의 7시 발화는 아침 템플릿으로 나간다', async () => {
      await sendWeatherAlertAt('0 7,18 * * *', 7);

      expect(solapiService.sendWeatherAlert).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'morning',
      );
    });

    it('하루 한 번 울리는 알림은 종전 판정을 유지한다', async () => {
      await sendWeatherAlertAt('0 8 * * *', 8);

      expect(solapiService.sendWeatherAlert).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'morning',
      );
    });

    /**
     * 재시도로 발송이 예정 시각을 넘겨도 템플릿은 **예정된 시각**을 따른다.
     * 현재 시각만 보면 11:55 알림의 3분 뒤 재시도가 저녁 템플릿으로 뒤집힌다.
     */
    it('예정 시각을 조금 넘겨 발송돼도 예정 시각 기준을 따른다', async () => {
      await sendWeatherAlertAt('55 11 * * *', 12);

      expect(solapiService.sendWeatherAlert).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'morning',
      );
    });
  });
});
