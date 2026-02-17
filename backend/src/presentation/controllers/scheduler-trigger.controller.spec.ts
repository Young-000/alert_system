import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerTriggerController } from './scheduler-trigger.controller';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { GenerateWeeklyReportUseCase } from '@application/use-cases/generate-weekly-report.use-case';

describe('SchedulerTriggerController', () => {
  let controller: SchedulerTriggerController;
  let sendNotificationUseCase: jest.Mocked<SendNotificationUseCase>;
  let generateWeeklyReportUseCase: jest.Mocked<GenerateWeeklyReportUseCase>;
  let configService: jest.Mocked<ConfigService>;

  const VALID_SECRET = 'my-scheduler-secret';

  const mockPayload = {
    alertId: 'alert-1',
    userId: 'user-123',
    alertTypes: ['weather', 'bus'],
  };

  beforeEach(async () => {
    sendNotificationUseCase = { execute: jest.fn() } as any;
    generateWeeklyReportUseCase = { execute: jest.fn() } as any;
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'SCHEDULER_SECRET') return VALID_SECRET;
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerTriggerController],
      providers: [
        { provide: SendNotificationUseCase, useValue: sendNotificationUseCase },
        { provide: GenerateWeeklyReportUseCase, useValue: generateWeeklyReportUseCase },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<SchedulerTriggerController>(SchedulerTriggerController);
  });

  describe('triggerNotification', () => {
    it('올바른 시크릿과 페이로드로 알림 발송 성공', async () => {
      sendNotificationUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.triggerNotification(mockPayload, VALID_SECRET);

      expect(sendNotificationUseCase.execute).toHaveBeenCalledWith('alert-1');
      expect(result).toEqual({
        success: true,
        message: 'Notification sent for alert alert-1',
      });
    });

    it('시크릿 헤더 없이 호출 시 UnauthorizedException', async () => {
      await expect(
        controller.triggerNotification(mockPayload, undefined as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(sendNotificationUseCase.execute).not.toHaveBeenCalled();
    });

    it('잘못된 시크릿으로 호출 시 UnauthorizedException', async () => {
      await expect(
        controller.triggerNotification(mockPayload, 'wrong-secret'),
      ).rejects.toThrow(UnauthorizedException);

      expect(sendNotificationUseCase.execute).not.toHaveBeenCalled();
    });

    it('시크릿 길이가 다를 때 UnauthorizedException (타이밍 세이프)', async () => {
      await expect(
        controller.triggerNotification(mockPayload, 'short'),
      ).rejects.toThrow(UnauthorizedException);

      expect(sendNotificationUseCase.execute).not.toHaveBeenCalled();
    });

    it('SCHEDULER_SECRET 미설정 시 UnauthorizedException', async () => {
      configService.get.mockReturnValue(undefined);

      // 새 controller 생성 (configService가 변경됨)
      const module = await Test.createTestingModule({
        controllers: [SchedulerTriggerController],
        providers: [
          { provide: SendNotificationUseCase, useValue: sendNotificationUseCase },
          { provide: GenerateWeeklyReportUseCase, useValue: generateWeeklyReportUseCase },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();
      const ctrl = module.get<SchedulerTriggerController>(SchedulerTriggerController);

      await expect(
        ctrl.triggerNotification(mockPayload, VALID_SECRET),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('알림 발송 실패 시 에러 전파 (EventBridge 재시도용)', async () => {
      sendNotificationUseCase.execute.mockRejectedValue(new Error('Notification failed'));

      await expect(
        controller.triggerNotification(mockPayload, VALID_SECRET),
      ).rejects.toThrow('Notification failed');
    });

    it('UnauthorizedException 에러 메시지 확인', async () => {
      await expect(
        controller.triggerNotification(mockPayload, 'wrong-secret'),
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('triggerWeeklyReport', () => {
    it('올바른 시크릿으로 주간 리포트 생성 성공', async () => {
      generateWeeklyReportUseCase.execute.mockResolvedValue({
        sent: 5,
        skipped: 2,
      });

      const result = await controller.triggerWeeklyReport(VALID_SECRET);

      expect(generateWeeklyReportUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        sent: 5,
        skipped: 2,
      });
    });

    it('시크릿 헤더 없이 호출 시 UnauthorizedException', async () => {
      await expect(
        controller.triggerWeeklyReport(undefined as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(generateWeeklyReportUseCase.execute).not.toHaveBeenCalled();
    });

    it('잘못된 시크릿으로 호출 시 UnauthorizedException', async () => {
      await expect(
        controller.triggerWeeklyReport('wrong-secret'),
      ).rejects.toThrow(UnauthorizedException);

      expect(generateWeeklyReportUseCase.execute).not.toHaveBeenCalled();
    });

    it('주간 리포트 생성 실패 시 에러 전파', async () => {
      generateWeeklyReportUseCase.execute.mockRejectedValue(new Error('Report failed'));

      await expect(
        controller.triggerWeeklyReport(VALID_SECRET),
      ).rejects.toThrow('Report failed');
    });
  });

  describe('healthCheck', () => {
    it('status ok 반환', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
