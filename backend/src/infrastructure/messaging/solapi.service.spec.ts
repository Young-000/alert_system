import { ConfigService } from '@nestjs/config';
import {
  SolapiService,
  NoopSolapiService,
  TEMPLATE_IDS,
} from './solapi.service';
import type {
  WeatherAlertVariables,
  TransitAlertVariables,
  CombinedAlertVariables,
  LegacyWeatherVariables,
  WeeklyReportVariables,
} from './solapi.service';

// solapi 모킹
const mockSendOne = jest.fn();
jest.mock('solapi', () => ({
  SolapiMessageService: jest.fn().mockImplementation(() => ({
    sendOne: mockSendOne,
  })),
}));

describe('SolapiService', () => {
  let service: SolapiService;
  let mockConfigService: jest.Mocked<ConfigService>;

  const createConfigService = (overrides?: Record<string, string>): jest.Mocked<ConfigService> => {
    const defaults: Record<string, string> = {
      SOLAPI_API_KEY: 'test-api-key',
      SOLAPI_API_SECRET: 'test-api-secret',
      SOLAPI_PF_ID: 'test-pf-id',
      SOLAPI_TEMPLATE_ID: 'test-template-id',
      ...overrides,
    };

    return {
      get: jest.fn((key: string, defaultValue?: string) => defaults[key] ?? defaultValue ?? ''),
    } as unknown as jest.Mocked<ConfigService>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = createConfigService();
    service = new SolapiService(mockConfigService);
  });

  describe('sendAlimtalk', () => {
    it('알림톡을 성공적으로 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({ statusCode: '2000' });

      await service.sendAlimtalk({
        to: '01012345678',
        templateId: 'test-template',
        variables: { userName: '테스트' },
      });

      expect(mockSendOne).toHaveBeenCalledWith({
        to: '01012345678',
        kakaoOptions: {
          pfId: 'test-pf-id',
          templateId: 'test-template',
          variables: { userName: '테스트' },
        },
      });
    });

    it('전화번호 하이픈을 제거한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendAlimtalk({
        to: '010-1234-5678',
        templateId: 'test-template',
        variables: {},
      });

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '01012345678',
        }),
      );
    });

    it('API 에러 발생 시 예외를 전파한다', async () => {
      mockSendOne.mockRejectedValueOnce(new Error('Solapi error'));

      await expect(
        service.sendAlimtalk({
          to: '01012345678',
          templateId: 'test-template',
          variables: {},
        }),
      ).rejects.toThrow('Solapi error');
    });

    it('설정이 없으면 Mock 모드로 동작한다', async () => {
      const unconfiguredService = new SolapiService(
        createConfigService({
          SOLAPI_API_KEY: '',
          SOLAPI_API_SECRET: '',
          SOLAPI_PF_ID: '',
        }),
      );

      await unconfiguredService.sendAlimtalk({
        to: '01012345678',
        templateId: 'test-template',
        variables: {},
      });

      expect(mockSendOne).not.toHaveBeenCalled();
    });
  });

  describe('sendWeatherAlert', () => {
    const weatherVars: WeatherAlertVariables = {
      userName: '홍길동',
      date: '2월 18일 화요일',
      currentTemp: '-2',
      minTemp: '-5',
      weather: '오전 맑음 -> 오후 구름',
      airQuality: '보통 (PM10 45ug/m3)',
      tip: '외투를 챙기세요!',
    };

    it('출근 날씨 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendWeatherAlert('01012345678', weatherVars, 'morning');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.WEATHER_MORNING,
            variables: expect.objectContaining({
              userName: '홍길동',
              currentTemp: '-2',
            }),
          }),
        }),
      );
    });

    it('퇴근 날씨 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendWeatherAlert('01012345678', weatherVars, 'evening');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.WEATHER_EVENING,
          }),
        }),
      );
    });
  });

  describe('sendTransitAlert', () => {
    const transitVars: TransitAlertVariables = {
      userName: '홍길동',
      subwayInfo: '강남역 (2호선) 3분',
      busInfo: '146번 2분',
      tip: '서두르세요!',
    };

    it('출근 교통 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendTransitAlert('01012345678', transitVars, 'morning');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.TRANSIT_MORNING,
            variables: expect.objectContaining({
              subwayInfo: '강남역 (2호선) 3분',
            }),
          }),
        }),
      );
    });

    it('퇴근 교통 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendTransitAlert('01012345678', transitVars, 'evening');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.TRANSIT_EVENING,
          }),
        }),
      );
    });
  });

  describe('sendCombinedAlert', () => {
    const combinedVars: CombinedAlertVariables = {
      userName: '홍길동',
      date: '2월 18일 화요일',
      currentTemp: '-2',
      minTemp: '-5',
      weather: '오전 맑음',
      airQuality: '보통',
      subwayInfo: '강남역 3분',
      busInfo: '146번 2분',
      tip: '따뜻하게 입으세요!',
    };

    it('출근 종합 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendCombinedAlert('01012345678', combinedVars, 'morning');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.COMBINED_MORNING,
            variables: expect.objectContaining({
              userName: '홍길동',
              subwayInfo: '강남역 3분',
              busInfo: '146번 2분',
            }),
          }),
        }),
      );
    });

    it('퇴근 종합 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      await service.sendCombinedAlert('01012345678', combinedVars, 'evening');

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: TEMPLATE_IDS.COMBINED_EVENING,
          }),
        }),
      );
    });
  });

  describe('sendLegacyWeatherAlert', () => {
    it('레거시 날씨 알림을 발송한다', async () => {
      mockSendOne.mockResolvedValueOnce({});

      const legacyVars: LegacyWeatherVariables = {
        userName: '홍길동',
        temperature: '5',
        condition: '맑음',
        airLevel: '보통',
        humidity: '40',
        tip: '건조해요',
      };

      await service.sendLegacyWeatherAlert('01012345678', legacyVars);

      expect(mockSendOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kakaoOptions: expect.objectContaining({
            templateId: 'test-template-id',
          }),
        }),
      );
    });
  });

  describe('sendWeeklyReport', () => {
    it('주간 리포트는 로깅만 수행한다 (템플릿 미승인)', async () => {
      const weeklyVars: WeeklyReportVariables = {
        userName: '홍길동',
        weekRange: '2/10~2/16',
        totalCommutes: '8',
        avgDuration: '42분',
        bestDay: '수요일',
        tip: '이번 주도 수고했어요!',
      };

      await service.sendWeeklyReport('01012345678', weeklyVars);

      // sendOne should NOT be called (only logging)
      expect(mockSendOne).not.toHaveBeenCalled();
    });
  });
});

describe('NoopSolapiService', () => {
  let service: NoopSolapiService;

  beforeEach(() => {
    service = new NoopSolapiService();
  });

  it('sendAlimtalk 호출 시 예외 없이 완료한다', async () => {
    await expect(
      service.sendAlimtalk({
        to: '01012345678',
        templateId: 'test',
        variables: {},
      }),
    ).resolves.not.toThrow();
  });

  it('sendWeatherAlert 호출 시 예외 없이 완료한다', async () => {
    await expect(
      service.sendWeatherAlert('01012345678', {
        userName: 'test', date: '', currentTemp: '', minTemp: '',
        weather: '', airQuality: '', tip: '',
      }, 'morning'),
    ).resolves.not.toThrow();
  });

  it('sendCombinedAlert 호출 시 예외 없이 완료한다', async () => {
    await expect(
      service.sendCombinedAlert('01012345678', {
        userName: 'test', date: '', currentTemp: '', minTemp: '',
        weather: '', airQuality: '', subwayInfo: '', busInfo: '', tip: '',
      }, 'morning'),
    ).resolves.not.toThrow();
  });

  it('sendWeeklyReport 호출 시 예외 없이 완료한다', async () => {
    await expect(
      service.sendWeeklyReport('01012345678', {
        userName: 'test', weekRange: '', totalCommutes: '',
        avgDuration: '', bestDay: '', tip: '',
      }),
    ).resolves.not.toThrow();
  });
});
