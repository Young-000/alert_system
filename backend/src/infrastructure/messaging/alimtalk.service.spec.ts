import { AlimtalkService, NoopAlimtalkService, AlimtalkMessage } from './alimtalk.service';

// fetch 모킹
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AlimtalkService', () => {
  let service: AlimtalkService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // 환경 변수 설정
    process.env = {
      ...originalEnv,
      NHN_CLOUD_APP_KEY: 'test-app-key',
      NHN_CLOUD_SECRET_KEY: 'test-secret-key',
      NHN_CLOUD_SENDER_KEY: 'test-sender-key',
      NHN_CLOUD_SENDER_NUMBER: '01012345678',
    };

    service = new AlimtalkService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendAlimtalk', () => {
    const mockMessage: AlimtalkMessage = {
      to: '01098765432',
      templateCode: 'ALERT_TEMPLATE_001',
      variables: {
        weather: '맑음 15°C',
        airQuality: '좋음 (PM10: 25)',
        subway: '강남역 2호선 3분 후 도착',
      },
    };

    it('알림톡 발송 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: 0,
            resultMessage: 'SUCCESS',
            isSuccessful: true,
          },
          message: {
            requestId: 'test-request-id',
            sendResults: [
              {
                recipientSeq: 1,
                recipientNo: '01098765432',
                resultCode: 0,
                resultMessage: 'SUCCESS',
              },
            ],
          },
        }),
      });

      await service.sendAlimtalk(mockMessage);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/test-app-key/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-Secret-Key': 'test-secret-key',
          },
        }),
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.senderKey).toBe('test-sender-key');
      expect(requestBody.templateCode).toBe('ALERT_TEMPLATE_001');
      expect(requestBody.recipientList[0].recipientNo).toBe('01098765432');
      expect(requestBody.recipientList[0].templateParameter).toEqual(mockMessage.variables);
    });

    it('알림톡 API 실패 시 예외 발생', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: -1000,
            resultMessage: 'Invalid sender key',
            isSuccessful: false,
          },
        }),
      });

      await expect(service.sendAlimtalk(mockMessage)).rejects.toThrow('Alimtalk failed: Invalid sender key');
    });

    it('수신자 발송 실패 시 예외 발생', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: 0,
            resultMessage: 'SUCCESS',
            isSuccessful: true,
          },
          message: {
            requestId: 'test-request-id',
            sendResults: [
              {
                recipientSeq: 1,
                recipientNo: '01098765432',
                resultCode: -1001,
                resultMessage: 'Invalid phone number',
              },
            ],
          },
        }),
      });

      await expect(service.sendAlimtalk(mockMessage)).rejects.toThrow('Alimtalk send failed: Invalid phone number');
    });

    it('빈 변수로 알림톡 발송', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: 0,
            resultMessage: 'SUCCESS',
            isSuccessful: true,
          },
          message: {
            requestId: 'test-request-id',
            sendResults: [
              {
                recipientSeq: 1,
                recipientNo: '01098765432',
                resultCode: 0,
                resultMessage: 'SUCCESS',
              },
            ],
          },
        }),
      });

      const emptyMessage: AlimtalkMessage = {
        to: '01098765432',
        templateCode: 'ALERT_TEMPLATE_002',
        variables: {},
      };

      await service.sendAlimtalk(emptyMessage);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('전화번호 하이픈 제거', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: { resultCode: 0, resultMessage: 'SUCCESS', isSuccessful: true },
          message: {
            requestId: 'test',
            sendResults: [{ recipientSeq: 1, recipientNo: '01098765432', resultCode: 0, resultMessage: 'SUCCESS' }],
          },
        }),
      });

      await service.sendAlimtalk({
        to: '010-9876-5432',
        templateCode: 'TEST',
        variables: {},
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.recipientList[0].recipientNo).toBe('01098765432');
    });
  });

  describe('sendSMS', () => {
    it('SMS 발송 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: 0,
            resultMessage: 'SUCCESS',
            isSuccessful: true,
          },
        }),
      });

      await service.sendSMS('01098765432', '테스트 메시지입니다.');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-sms.cloud.toast.com/sms/v3.0/appkeys/test-app-key/sender/sms',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-Secret-Key': 'test-secret-key',
          },
        }),
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.body).toBe('테스트 메시지입니다.');
      expect(requestBody.sendNo).toBe('01012345678');
      expect(requestBody.recipientList[0].recipientNo).toBe('01098765432');
    });

    it('SMS 발송 실패 시 예외 전파', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          header: {
            resultCode: -1000,
            resultMessage: 'SMS Send Failed',
            isSuccessful: false,
          },
        }),
      });

      await expect(
        service.sendSMS('01098765432', '테스트'),
      ).rejects.toThrow('SMS failed: SMS Send Failed');
    });
  });

  describe('API 자격증명 없는 경우', () => {
    it('API 키 없으면 Mock 모드로 동작', async () => {
      process.env.NHN_CLOUD_APP_KEY = '';
      process.env.NHN_CLOUD_SECRET_KEY = '';
      process.env.NHN_CLOUD_SENDER_KEY = '';

      const noCredService = new AlimtalkService();

      // Mock 모드에서는 fetch가 호출되지 않음
      await noCredService.sendAlimtalk({
        to: '01012345678',
        templateCode: 'TEST',
        variables: {},
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('SMS도 Mock 모드로 동작', async () => {
      process.env.NHN_CLOUD_APP_KEY = '';
      process.env.NHN_CLOUD_SECRET_KEY = '';
      process.env.NHN_CLOUD_SENDER_KEY = '';

      const noCredService = new AlimtalkService();

      await noCredService.sendSMS('01012345678', '테스트');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe('NoopAlimtalkService', () => {
  let service: NoopAlimtalkService;

  beforeEach(() => {
    service = new NoopAlimtalkService();
  });

  it('알림톡 발송 시 예외 없이 완료', async () => {
    await expect(
      service.sendAlimtalk({
        to: '01012345678',
        templateCode: 'TEST',
        variables: { test: 'value' },
      }),
    ).resolves.not.toThrow();
  });

  it('SMS 발송 시 예외 없이 완료', async () => {
    await expect(
      service.sendSMS('01012345678', '테스트'),
    ).resolves.not.toThrow();
  });
});
