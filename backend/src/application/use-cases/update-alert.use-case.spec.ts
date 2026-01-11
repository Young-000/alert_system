import { NotFoundException } from '@nestjs/common';
import { UpdateAlertUseCase } from './update-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';
import { Alert, AlertType } from '@domain/entities/alert.entity';

describe('UpdateAlertUseCase', () => {
  let useCase: UpdateAlertUseCase;
  let mockAlertRepository: jest.Mocked<IAlertRepository>;
  let mockNotificationScheduler: jest.Mocked<INotificationScheduler>;

  const createMockAlert = (overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    schedule: string;
    alertTypes: AlertType[];
    enabled: boolean;
    busStopId: string;
    subwayStationId: string;
  }> = {}): Alert => {
    const alert = new Alert(
      overrides.userId ?? 'user-1',
      overrides.name ?? '출근 알림',
      overrides.schedule ?? '0 8 * * 1-5',
      overrides.alertTypes ?? [AlertType.WEATHER, AlertType.AIR_QUALITY],
      overrides.busStopId,
      overrides.subwayStationId,
      overrides.id ?? 'alert-1',
    );
    // Alert는 기본적으로 enabled=true로 생성됨
    // enabled=false가 필요하면 disable() 호출
    if (overrides.enabled === false) {
      alert.disable();
    }
    return alert;
  };

  beforeEach(() => {
    mockAlertRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockNotificationScheduler = {
      scheduleNotification: jest.fn(),
      cancelNotification: jest.fn(),
    };

    useCase = new UpdateAlertUseCase(
      mockAlertRepository,
      mockNotificationScheduler,
    );
  });

  describe('execute - 기본 업데이트', () => {
    it('알림 이름 업데이트', async () => {
      const existingAlert = createMockAlert();
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', { name: '퇴근 알림' });

      expect(result.name).toBe('퇴근 알림');
      expect(mockAlertRepository.save).toHaveBeenCalled();
    });

    it('알림 타입 업데이트', async () => {
      const existingAlert = createMockAlert();
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', {
        alertTypes: [AlertType.BUS, AlertType.SUBWAY],
      });

      expect(result.alertTypes).toEqual([AlertType.BUS, AlertType.SUBWAY]);
    });

    it('버스 정류장 ID 업데이트', async () => {
      const existingAlert = createMockAlert();
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', {
        busStopId: 'bus-stop-123',
      });

      expect((result as any).busStopId).toBe('bus-stop-123');
    });

    it('지하철역 ID 업데이트', async () => {
      const existingAlert = createMockAlert();
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', {
        subwayStationId: 'station-456',
      });

      expect((result as any).subwayStationId).toBe('station-456');
    });

    it('존재하지 않는 알림 업데이트 시 NotFoundException', async () => {
      mockAlertRepository.findById.mockResolvedValue(undefined);

      await expect(
        useCase.execute('non-existent', { name: '새 이름' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute('non-existent', { name: '새 이름' }),
      ).rejects.toThrow('알림을 찾을 수 없습니다.');
    });
  });

  describe('execute - 스케줄러 연동', () => {
    /**
     * 스케줄러 연동 시나리오:
     * 1. 비활성→활성: 새로 스케줄링
     * 2. 활성→비활성: 스케줄 취소
     * 3. 활성 상태에서 schedule 변경: 재스케줄링
     * 4. 활성 상태에서 schedule 변경 없음: 스케줄러 호출 없음
     */

    it('비활성 알림을 활성화하면 스케줄러에 등록', async () => {
      const existingAlert = createMockAlert({ enabled: false });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', { enabled: true });

      expect(mockNotificationScheduler.scheduleNotification).toHaveBeenCalledWith(
        existingAlert,
      );
      expect(mockNotificationScheduler.cancelNotification).not.toHaveBeenCalled();
    });

    it('활성 알림을 비활성화하면 스케줄러에서 취소', async () => {
      const existingAlert = createMockAlert({ enabled: true });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', { enabled: false });

      expect(mockNotificationScheduler.cancelNotification).toHaveBeenCalledWith(
        'alert-1',
      );
      expect(mockNotificationScheduler.scheduleNotification).not.toHaveBeenCalled();
    });

    it('활성 상태에서 스케줄 변경 시 재스케줄링', async () => {
      const existingAlert = createMockAlert({
        enabled: true,
        schedule: '0 8 * * 1-5',
      });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', { schedule: '0 18 * * 1-5' });

      expect(mockNotificationScheduler.scheduleNotification).toHaveBeenCalled();
      expect(mockNotificationScheduler.cancelNotification).not.toHaveBeenCalled();
    });

    it('활성 상태에서 스케줄 변경 없이 다른 속성만 변경 시 스케줄러 호출 없음', async () => {
      const existingAlert = createMockAlert({ enabled: true });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', { name: '새 이름' });

      expect(mockNotificationScheduler.scheduleNotification).not.toHaveBeenCalled();
      expect(mockNotificationScheduler.cancelNotification).not.toHaveBeenCalled();
    });

    it('비활성 상태 유지 시 스케줄러 호출 없음', async () => {
      const existingAlert = createMockAlert({ enabled: false });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', { name: '새 이름' });

      expect(mockNotificationScheduler.scheduleNotification).not.toHaveBeenCalled();
      expect(mockNotificationScheduler.cancelNotification).not.toHaveBeenCalled();
    });

    it('활성화와 동시에 스케줄 변경', async () => {
      const existingAlert = createMockAlert({ enabled: false });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', {
        enabled: true,
        schedule: '0 7 * * 1-5',
      });

      expect(mockNotificationScheduler.scheduleNotification).toHaveBeenCalledWith(
        existingAlert,
      );
    });

    it('비활성화 시 스케줄 변경은 무시 (취소만 수행)', async () => {
      const existingAlert = createMockAlert({ enabled: true });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      await useCase.execute('alert-1', {
        enabled: false,
        schedule: '0 7 * * 1-5',
      });

      expect(mockNotificationScheduler.cancelNotification).toHaveBeenCalledWith(
        'alert-1',
      );
      expect(mockNotificationScheduler.scheduleNotification).not.toHaveBeenCalled();
    });
  });

  describe('execute - 복합 시나리오', () => {
    it('모든 필드 동시 업데이트', async () => {
      const existingAlert = createMockAlert({ enabled: false });
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', {
        name: '통합 알림',
        schedule: '0 7 * * 1-5',
        alertTypes: [AlertType.WEATHER, AlertType.BUS],
        enabled: true,
        busStopId: 'bus-123',
        subwayStationId: 'subway-456',
      });

      expect(result.name).toBe('통합 알림');
      expect(result.alertTypes).toEqual([AlertType.WEATHER, AlertType.BUS]);
      expect(mockNotificationScheduler.scheduleNotification).toHaveBeenCalled();
    });

    it('빈 DTO로 업데이트 시 변경 없음', async () => {
      const existingAlert = createMockAlert();
      mockAlertRepository.findById.mockResolvedValue(existingAlert);
      mockAlertRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute('alert-1', {});

      expect(result.name).toBe('출근 알림');
      expect(mockAlertRepository.save).toHaveBeenCalled();
    });
  });
});
