import { AlimtalkService, NoopAlimtalkService, AlimtalkMessage } from './alimtalk.service';

// Solapi 모킹
jest.mock('solapi', () => ({
  SolapiMessageService: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
}));

describe('AlimtalkService', () => {
  let service: AlimtalkService;
  let mockSend: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // 환경 변수 설정
    process.env = {
      ...originalEnv,
      SOLAPI_API_KEY: 'test-api-key',
      SOLAPI_API_SECRET: 'test-api-secret',
      SOLAPI_SENDER_NUMBER: '01012345678',
      SOLAPI_PFID: 'test-pfid',
    };

    // Solapi 모킹 설정
    const { SolapiMessageService } = require('solapi');
    mockSend = jest.fn().mockResolvedValue({ success: true });
    SolapiMessageService.mockImplementation(() => ({
      send: mockSend,
    }));

    service = new AlimtalkService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendAlimtalk', () => {
    const mockMessage: AlimtalkMessage = {
      to: '01098765432',
      templateId: 'ALERT_TEMPLATE_001',
      variables: {
        weather: '맑음 15°C',
        airQuality: '좋음 (PM10: 25)',
        subway: '강남역 2호선 3분 후 도착',
      },
    };

    it('알림톡 발송 성공', async () => {
      await service.sendAlimtalk(mockMessage);

      expect(mockSend).toHaveBeenCalledWith({
        to: '01098765432',
        from: '01012345678',
        kakaoOptions: {
          pfId: 'test-pfid',
          templateId: 'ALERT_TEMPLATE_001',
          variables: mockMessage.variables,
        },
      });
    });

    it('알림톡 실패 시 SMS로 폴백', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('Kakao API Error'))
        .mockResolvedValueOnce({ success: true });

      await service.sendAlimtalk(mockMessage);

      // 알림톡 시도
      expect(mockSend).toHaveBeenNthCalledWith(1, expect.objectContaining({
        kakaoOptions: expect.any(Object),
      }));

      // SMS 폴백
      expect(mockSend).toHaveBeenNthCalledWith(2, {
        to: '01098765432',
        from: '01012345678',
        text: expect.stringContaining('[Alert System]'),
      });
    });

    it('빈 변수로 알림톡 발송', async () => {
      const emptyMessage: AlimtalkMessage = {
        to: '01098765432',
        templateId: 'ALERT_TEMPLATE_002',
        variables: {},
      };

      await service.sendAlimtalk(emptyMessage);

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendSMS', () => {
    it('SMS 발송 성공', async () => {
      await service.sendSMS('01098765432', '테스트 메시지입니다.');

      expect(mockSend).toHaveBeenCalledWith({
        to: '01098765432',
        from: '01012345678',
        text: '테스트 메시지입니다.',
      });
    });

    it('SMS 발송 실패 시 예외 전파', async () => {
      mockSend.mockRejectedValue(new Error('SMS Send Failed'));

      await expect(
        service.sendSMS('01098765432', '테스트'),
      ).rejects.toThrow('SMS Send Failed');
    });
  });

  describe('API 자격증명 없는 경우', () => {
    it('API 키 없으면 Mock 모드로 동작', async () => {
      process.env.SOLAPI_API_KEY = '';
      process.env.SOLAPI_API_SECRET = '';

      const noCredService = new AlimtalkService();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await noCredService.sendAlimtalk({
        to: '01012345678',
        templateId: 'TEST',
        variables: {},
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Mock Alimtalk]',
        expect.any(Object),
      );
      consoleSpy.mockRestore();
    });
  });
});

describe('NoopAlimtalkService', () => {
  let service: NoopAlimtalkService;

  beforeEach(() => {
    service = new NoopAlimtalkService();
  });

  it('알림톡 발송 시 로그만 출력', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.sendAlimtalk({
      to: '01012345678',
      templateId: 'TEST',
      variables: { test: 'value' },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Noop Alimtalk]',
      expect.objectContaining({ to: '01012345678' }),
    );
    consoleSpy.mockRestore();
  });

  it('SMS 발송 시 로그만 출력', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await service.sendSMS('01012345678', '테스트');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Noop SMS]',
      { to: '01012345678', text: '테스트' },
    );
    consoleSpy.mockRestore();
  });
});

describe('SMS 포맷팅', () => {
  let service: AlimtalkService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    process.env.SOLAPI_API_KEY = 'test';
    process.env.SOLAPI_API_SECRET = 'test';
    process.env.SOLAPI_SENDER_NUMBER = '01012345678';

    const { SolapiMessageService } = require('solapi');
    mockSend = jest.fn()
      .mockRejectedValueOnce(new Error('Kakao Error'))
      .mockResolvedValueOnce({ success: true });
    SolapiMessageService.mockImplementation(() => ({
      send: mockSend,
    }));

    service = new AlimtalkService();
  });

  it('모든 변수가 있는 경우 SMS 포맷', async () => {
    await service.sendAlimtalk({
      to: '01012345678',
      templateId: 'TEST',
      variables: {
        weather: '맑음 15°C',
        airQuality: '좋음',
        subway: '강남역 3분',
        bus: '146번 5분',
      },
    });

    expect(mockSend).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: expect.stringContaining('날씨: 맑음 15°C'),
    }));
  });

  it('일부 변수만 있는 경우 SMS 포맷', async () => {
    await service.sendAlimtalk({
      to: '01012345678',
      templateId: 'TEST',
      variables: {
        weather: '흐림 10°C',
      },
    });

    const smsCall = mockSend.mock.calls[1][0];
    expect(smsCall.text).toContain('[Alert System]');
    expect(smsCall.text).toContain('날씨: 흐림 10°C');
    expect(smsCall.text).not.toContain('미세먼지');
    expect(smsCall.text).not.toContain('지하철');
  });
});
