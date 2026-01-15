import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertController } from './alert.controller';
import { CreateAlertUseCase } from '@application/use-cases/create-alert.use-case';
import { DeleteAlertUseCase } from '@application/use-cases/delete-alert.use-case';
import { UpdateAlertUseCase } from '@application/use-cases/update-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';

describe('AlertController', () => {
  let controller: AlertController;
  let createAlertUseCase: jest.Mocked<CreateAlertUseCase>;
  let deleteAlertUseCase: jest.Mocked<DeleteAlertUseCase>;
  let updateAlertUseCase: jest.Mocked<UpdateAlertUseCase>;
  let alertRepository: jest.Mocked<IAlertRepository>;

  const mockAlert = new Alert(
    'user-123',
    '출근 알림',
    '0 8 * * 1-5',
    [AlertType.WEATHER, AlertType.AIR_QUALITY],
    undefined,
    undefined,
    'alert-1',
  );

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  });

  beforeEach(async () => {
    createAlertUseCase = {
      execute: jest.fn(),
    } as any;

    deleteAlertUseCase = {
      execute: jest.fn(),
    } as any;

    updateAlertUseCase = {
      execute: jest.fn(),
    } as any;

    alertRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [
        { provide: CreateAlertUseCase, useValue: createAlertUseCase },
        { provide: DeleteAlertUseCase, useValue: deleteAlertUseCase },
        { provide: UpdateAlertUseCase, useValue: updateAlertUseCase },
        { provide: 'IAlertRepository', useValue: alertRepository },
      ],
    }).compile();

    controller = module.get<AlertController>(AlertController);
  });

  describe('create', () => {
    const createDto = {
      userId: 'user-123',
      name: '출근 알림',
      schedule: '0 8 * * 1-5',
      alertTypes: [AlertType.WEATHER],
    };

    it('자신의 알림 생성 성공', async () => {
      createAlertUseCase.execute.mockResolvedValue(mockAlert);

      const result = await controller.create(createDto, mockRequest('user-123'));

      expect(createAlertUseCase.execute).toHaveBeenCalledWith(createDto);
      expect(result).toBe(mockAlert);
    });

    it('다른 사용자의 알림 생성 시 ForbiddenException', async () => {
      await expect(
        controller.create(createDto, mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.create(createDto, mockRequest('other-user')),
      ).rejects.toThrow('다른 사용자의 알림을 생성할 수 없습니다.');

      expect(createAlertUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('자신의 알림 목록 조회 성공', async () => {
      alertRepository.findByUserId.mockResolvedValue([mockAlert]);

      const result = await controller.findByUser('user-123', mockRequest('user-123'));

      expect(alertRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([mockAlert]);
    });

    it('다른 사용자의 알림 목록 조회 시 ForbiddenException', async () => {
      await expect(
        controller.findByUser('user-123', mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);

      expect(alertRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('알림이 없을 때 빈 배열 반환', async () => {
      alertRepository.findByUserId.mockResolvedValue([]);

      const result = await controller.findByUser('user-123', mockRequest('user-123'));

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('자신의 알림 단건 조회 성공', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      const result = await controller.findOne('alert-1', mockRequest('user-123'));

      expect(alertRepository.findById).toHaveBeenCalledWith('alert-1');
      expect(result).toBe(mockAlert);
    });

    it('존재하지 않는 알림 조회 시 NotFoundException', async () => {
      alertRepository.findById.mockResolvedValue(undefined);

      await expect(
        controller.findOne('non-existent', mockRequest('user-123')),
      ).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 알림 조회 시 ForbiddenException', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      await expect(
        controller.findOne('alert-1', mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { name: '퇴근 알림' };

    it('자신의 알림 수정 성공', async () => {
      const updatedAlert = new Alert(
        'user-123',
        '퇴근 알림',
        '0 8 * * 1-5',
        [AlertType.WEATHER, AlertType.AIR_QUALITY],
        undefined,
        undefined,
        'alert-1',
      );
      alertRepository.findById.mockResolvedValue(mockAlert);
      updateAlertUseCase.execute.mockResolvedValue(updatedAlert);

      const result = await controller.update('alert-1', updateDto, mockRequest('user-123'));

      expect(updateAlertUseCase.execute).toHaveBeenCalledWith('alert-1', updateDto);
      expect(result).toBe(updatedAlert);
    });

    it('존재하지 않는 알림 수정 시 NotFoundException', async () => {
      alertRepository.findById.mockResolvedValue(undefined);

      await expect(
        controller.update('non-existent', updateDto, mockRequest('user-123')),
      ).rejects.toThrow(NotFoundException);

      expect(updateAlertUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 알림 수정 시 ForbiddenException', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      await expect(
        controller.update('alert-1', updateDto, mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);

      expect(updateAlertUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('활성 알림 비활성화 성공', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);
      updateAlertUseCase.execute.mockResolvedValue(mockAlert);

      await controller.toggle('alert-1', mockRequest('user-123'));

      expect(updateAlertUseCase.execute).toHaveBeenCalledWith('alert-1', {
        enabled: !mockAlert.enabled,
      });
    });

    it('비활성 알림 활성화 성공', async () => {
      const disabledAlert = new Alert(
        'user-123',
        '출근 알림',
        '0 8 * * 1-5',
        [AlertType.WEATHER],
        undefined,
        undefined,
        'alert-1',
      );
      disabledAlert.disable();

      alertRepository.findById.mockResolvedValue(disabledAlert);
      updateAlertUseCase.execute.mockResolvedValue(disabledAlert);

      await controller.toggle('alert-1', mockRequest('user-123'));

      expect(updateAlertUseCase.execute).toHaveBeenCalledWith('alert-1', {
        enabled: true, // disabled alert should toggle to enabled
      });
    });

    it('다른 사용자의 알림 토글 시 ForbiddenException', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      await expect(
        controller.toggle('alert-1', mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('자신의 알림 삭제 성공', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);
      deleteAlertUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.remove('alert-1', mockRequest('user-123'));

      expect(deleteAlertUseCase.execute).toHaveBeenCalledWith('alert-1');
      expect(result).toEqual({ message: 'Alert deleted' });
    });

    it('존재하지 않는 알림 삭제 시 NotFoundException', async () => {
      alertRepository.findById.mockResolvedValue(undefined);

      await expect(
        controller.remove('non-existent', mockRequest('user-123')),
      ).rejects.toThrow(NotFoundException);

      expect(deleteAlertUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 알림 삭제 시 ForbiddenException', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      await expect(
        controller.remove('alert-1', mockRequest('other-user')),
      ).rejects.toThrow(ForbiddenException);

      expect(deleteAlertUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('엣지 케이스', () => {
    it('여러 개의 알림을 가진 사용자 조회', async () => {
      const alerts = [
        mockAlert,
        new Alert('user-123', '퇴근 알림', '0 18 * * 1-5', [AlertType.BUS], 'bus-1', undefined, 'alert-2'),
        new Alert('user-123', '주말 알림', '0 10 * * 6,0', [AlertType.WEATHER], undefined, undefined, 'alert-3'),
      ];
      alertRepository.findByUserId.mockResolvedValue(alerts);

      const result = await controller.findByUser('user-123', mockRequest('user-123'));

      expect(result).toHaveLength(3);
    });

    it('모든 알림 타입을 포함한 알림 생성', async () => {
      const fullDto = {
        userId: 'user-123',
        name: '종합 알림',
        schedule: '0 8 * * *',
        alertTypes: [AlertType.WEATHER, AlertType.AIR_QUALITY, AlertType.BUS, AlertType.SUBWAY],
        busStopId: 'bus-123',
        subwayStationId: 'station-456',
      };
      const fullAlert = new Alert(
        'user-123',
        '종합 알림',
        '0 8 * * *',
        [AlertType.WEATHER, AlertType.AIR_QUALITY, AlertType.BUS, AlertType.SUBWAY],
        'bus-123',
        'station-456',
        'alert-full',
      );
      createAlertUseCase.execute.mockResolvedValue(fullAlert);

      const result = await controller.create(fullDto, mockRequest('user-123'));

      expect(result.alertTypes).toHaveLength(4);
    });
  });
});
