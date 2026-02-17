import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { ExportUserDataUseCase } from '../../application/use-cases/export-user-data.use-case';
import { DataRetentionService } from '../../application/services/data-retention.service';

describe('PrivacyController', () => {
  let controller: PrivacyController;
  let exportUserDataUseCase: jest.Mocked<ExportUserDataUseCase>;
  let dataRetentionService: jest.Mocked<DataRetentionService>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    exportUserDataUseCase = { execute: jest.fn() } as any;
    dataRetentionService = { deleteAllUserData: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivacyController],
      providers: [
        { provide: ExportUserDataUseCase, useValue: exportUserDataUseCase },
        { provide: DataRetentionService, useValue: dataRetentionService },
      ],
    }).compile();

    controller = module.get<PrivacyController>(PrivacyController);
  });

  describe('exportUserData', () => {
    const mockExportedData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: OWNER_ID,
        email: 'test@test.com',
        name: '테스트유저',
        createdAt: new Date().toISOString(),
      },
      alerts: [],
      behaviorEvents: [],
      commuteRecords: [],
      userPatterns: [],
    };

    it('자신의 데이터 내보내기 성공', async () => {
      exportUserDataUseCase.execute.mockResolvedValue(mockExportedData as any);

      const result = await controller.exportUserData(OWNER_ID, mockRequest(OWNER_ID));

      expect(exportUserDataUseCase.execute).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(mockExportedData);
    });

    it('다른 사용자의 데이터 내보내기 시 ForbiddenException', async () => {
      await expect(
        controller.exportUserData(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(exportUserDataUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자 접근 시 올바른 에러 메시지', async () => {
      await expect(
        controller.exportUserData(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 데이터에 접근할 수 없습니다.');
    });
  });

  describe('deleteAllUserData', () => {
    it('자신의 추적 데이터 삭제 성공', async () => {
      dataRetentionService.deleteAllUserData.mockResolvedValue({
        behaviorEvents: 15,
        commuteRecords: 5,
      });

      const result = await controller.deleteAllUserData(OWNER_ID, mockRequest(OWNER_ID));

      expect(dataRetentionService.deleteAllUserData).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual({
        message: 'User tracking data deleted successfully',
        deleted: {
          behaviorEvents: 15,
          commuteRecords: 5,
        },
      });
    });

    it('다른 사용자의 데이터 삭제 시 ForbiddenException', async () => {
      await expect(
        controller.deleteAllUserData(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(dataRetentionService.deleteAllUserData).not.toHaveBeenCalled();
    });

    it('다른 사용자 접근 시 올바른 에러 메시지', async () => {
      await expect(
        controller.deleteAllUserData(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 데이터를 삭제할 수 없습니다.');
    });

    it('삭제할 데이터가 없어도 성공 반환', async () => {
      dataRetentionService.deleteAllUserData.mockResolvedValue({
        behaviorEvents: 0,
        commuteRecords: 0,
      });

      const result = await controller.deleteAllUserData(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.deleted.behaviorEvents).toBe(0);
      expect(result.deleted.commuteRecords).toBe(0);
    });
  });
});
