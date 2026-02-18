import { EventBridgeSchedulerService } from './eventbridge-scheduler.service';
import { Alert, AlertType } from '@domain/entities/alert.entity';

// AWS SDK mock
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-scheduler', () => {
  return {
    SchedulerClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    CreateScheduleCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'Create' })),
    DeleteScheduleCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'Delete' })),
    GetScheduleCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'Get' })),
    UpdateScheduleCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'Update' })),
    FlexibleTimeWindowMode: { OFF: 'OFF' },
    ScheduleState: { ENABLED: 'ENABLED', DISABLED: 'DISABLED' },
    ActionAfterCompletion: { NONE: 'NONE' },
  };
});

describe('EventBridgeSchedulerService', () => {
  let service: EventBridgeSchedulerService;
  const originalEnv = process.env;

  const createAlert = (overrides?: Partial<{
    id: string;
    userId: string;
    schedule: string;
    enabled: boolean;
  }>): Alert => {
    const alert = new Alert(
      overrides?.userId || 'user-1',
      '출근 알림',
      overrides?.schedule || '0 8 * * 1-5',
      [AlertType.WEATHER],
      undefined,
      undefined,
      overrides?.id || 'alert-1',
    );
    if (overrides?.enabled === false) {
      alert.disable();
    }
    return alert;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AWS_REGION: 'ap-northeast-2',
      AWS_ACCOUNT_ID: '123456789012',
      SCHEDULE_GROUP_NAME: 'test-group',
      SCHEDULER_ROLE_ARN: 'arn:aws:iam::123456789012:role/test-role',
      SCHEDULER_DLQ_ARN: 'arn:aws:sqs:ap-northeast-2:123456789012:dlq',
    };

    service = new EventBridgeSchedulerService();
    service.onModuleInit();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('convertToEventBridgeCron (scheduleNotification을 통해 간접 테스트)', () => {
    it('표준 5필드 cron을 EventBridge 형식으로 변환한다', async () => {
      // GetSchedule: not found → create
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError)  // getSchedule
        .mockResolvedValueOnce({});             // createSchedule

      const alert = createAlert({ schedule: '0 8 * * 1-5' });
      await service.scheduleNotification(alert);

      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ScheduleExpression: 'cron(0 8 ? * MON-FRI *)',
        }),
      );
    });

    it('요일이 *이면 dayOfWeek를 ?로 변환한다', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({});

      const alert = createAlert({ schedule: '30 7 * * *' });
      await service.scheduleNotification(alert);

      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ScheduleExpression: 'cron(30 7 * * ? *)',
        }),
      );
    });

    it('HH:mm 형식을 매일 반복 cron으로 변환한다', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({});

      const alert = createAlert({ schedule: '08:30' });
      await service.scheduleNotification(alert);

      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ScheduleExpression: 'cron(30 08 ? * * *)',
        }),
      );
    });

    it('이미 EventBridge 형식이면 그대로 사용한다', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({});

      const alert = createAlert({ schedule: 'cron(0 8 ? * MON-FRI *)' });
      await service.scheduleNotification(alert);

      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ScheduleExpression: 'cron(0 8 ? * MON-FRI *)',
        }),
      );
    });

    it('요일 목록을 올바르게 변환한다 (1,3,5 -> MON,WED,FRI)', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce({});

      const alert = createAlert({ schedule: '0 9 * * 1,3,5' });
      await service.scheduleNotification(alert);

      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ScheduleExpression: 'cron(0 9 ? * MON,WED,FRI *)',
        }),
      );
    });
  });

  describe('scheduleNotification', () => {
    it('기존 스케줄이 없으면 새로 생성한다', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError) // getSchedule
        .mockResolvedValueOnce({});            // createSchedule

      await service.scheduleNotification(createAlert());

      expect(mockSend).toHaveBeenCalledTimes(2);
      const { CreateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(CreateScheduleCommand).toHaveBeenCalled();
    });

    it('기존 스케줄이 있으면 업데이트한다', async () => {
      mockSend
        .mockResolvedValueOnce({})  // getSchedule (found)
        .mockResolvedValueOnce({}); // updateSchedule

      await service.scheduleNotification(createAlert());

      expect(mockSend).toHaveBeenCalledTimes(2);
      const { UpdateScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(UpdateScheduleCommand).toHaveBeenCalled();
    });

    it('비활성화된 알림이면 스케줄을 삭제한다', async () => {
      mockSend.mockResolvedValueOnce({}); // deleteSchedule

      const disabledAlert = createAlert({ enabled: false });
      await service.scheduleNotification(disabledAlert);

      const { DeleteScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(DeleteScheduleCommand).toHaveBeenCalled();
    });

    it('설정이 완료되지 않으면 스킵한다', async () => {
      process.env.SCHEDULER_ROLE_ARN = '';
      const unconfiguredService = new EventBridgeSchedulerService();
      unconfiguredService.onModuleInit();

      await unconfiguredService.scheduleNotification(createAlert());

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('AWS 에러 발생 시 예외를 전파한다', async () => {
      const awsError = new Error('Throttling');
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend
        .mockRejectedValueOnce(notFoundError) // getSchedule
        .mockRejectedValueOnce(awsError);      // createSchedule fails

      await expect(service.scheduleNotification(createAlert())).rejects.toThrow('Throttling');
    });
  });

  describe('cancelNotification', () => {
    it('스케줄을 삭제한다', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.cancelNotification('alert-1');

      const { DeleteScheduleCommand } = jest.requireMock('@aws-sdk/client-scheduler');
      expect(DeleteScheduleCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'alert-alert-1',
          GroupName: 'test-group',
        }),
      );
    });

    it('존재하지 않는 스케줄 삭제 시 무시한다', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(notFoundError);

      await expect(service.cancelNotification('nonexistent')).resolves.not.toThrow();
    });

    it('설정이 없으면 삭제를 스킵한다', async () => {
      process.env.SCHEDULER_ROLE_ARN = '';
      const unconfiguredService = new EventBridgeSchedulerService();
      unconfiguredService.onModuleInit();

      await unconfiguredService.cancelNotification('alert-1');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('ResourceNotFoundException 이외의 에러는 전파한다', async () => {
      const error = new Error('AccessDenied');
      error.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(error);

      await expect(service.cancelNotification('alert-1')).rejects.toThrow('AccessDenied');
    });
  });

  describe('constructor', () => {
    it('AWS_ACCOUNT_ID가 없으면 에러를 발생시킨다', () => {
      delete process.env.AWS_ACCOUNT_ID;

      expect(() => new EventBridgeSchedulerService()).toThrow(
        'AWS_ACCOUNT_ID environment variable is required but not set',
      );
    });
  });
});
