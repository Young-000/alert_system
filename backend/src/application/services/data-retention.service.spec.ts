import { DataRetentionService } from './data-retention.service';
import { IBehaviorEventRepository } from '../../domain/repositories/behavior-event.repository';
import { ICommuteRecordRepository } from '../../domain/repositories/commute-record.repository';
import { DEFAULT_PRIVACY_SETTINGS } from '../../domain/entities/privacy-settings.entity';

describe('DataRetentionService', () => {
  let service: DataRetentionService;
  let mockBehaviorRepo: jest.Mocked<IBehaviorEventRepository>;
  let mockCommuteRepo: jest.Mocked<ICommuteRecordRepository>;

  beforeEach(() => {
    mockBehaviorRepo = {
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      countByUserIdAndType: jest.fn(),
    };

    mockCommuteRepo = {
      deleteOlderThan: jest.fn(),
      deleteByUserId: jest.fn(),
      save: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
    } as unknown as jest.Mocked<ICommuteRecordRepository>;

    service = new DataRetentionService(mockBehaviorRepo, mockCommuteRepo);
  });

  describe('cleanupOldData', () => {
    it('행동 이벤트와 출퇴근 기록을 모두 정리한다', async () => {
      mockBehaviorRepo.deleteOlderThan.mockResolvedValue(10);
      mockCommuteRepo.deleteOlderThan.mockResolvedValue(5);

      await service.cleanupOldData();

      expect(mockBehaviorRepo.deleteOlderThan).toHaveBeenCalled();
      expect(mockCommuteRepo.deleteOlderThan).toHaveBeenCalled();
    });

    it('하나의 정리 작업이 실패해도 전체가 실패하지 않는다', async () => {
      mockBehaviorRepo.deleteOlderThan.mockRejectedValue(new Error('DB error'));
      mockCommuteRepo.deleteOlderThan.mockResolvedValue(5);

      // cleanupOldData catches errors internally
      await expect(service.cleanupOldData()).resolves.not.toThrow();
    });
  });

  describe('cleanupBehaviorEvents', () => {
    it('기본 보존 기간으로 오래된 이벤트를 삭제한다', async () => {
      mockBehaviorRepo.deleteOlderThan.mockResolvedValue(15);

      const result = await service.cleanupBehaviorEvents();

      expect(result).toBe(15);
      expect(mockBehaviorRepo.deleteOlderThan).toHaveBeenCalledWith(
        expect.any(Date),
      );

      // Verify the cutoff date is approximately correct (90 days ago)
      const calledDate = mockBehaviorRepo.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - DEFAULT_PRIVACY_SETTINGS.retention.behaviorEventsMaxDays);
      // Within 1 second tolerance
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('사용자 지정 보존 기간을 사용할 수 있다', async () => {
      mockBehaviorRepo.deleteOlderThan.mockResolvedValue(5);

      const result = await service.cleanupBehaviorEvents(30);

      expect(result).toBe(5);
      const calledDate = mockBehaviorRepo.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('리포지토리가 없으면 0을 반환한다', async () => {
      const serviceWithoutRepo = new DataRetentionService(null, mockCommuteRepo);

      const result = await serviceWithoutRepo.cleanupBehaviorEvents();

      expect(result).toBe(0);
    });

    it('에러 발생 시 0을 반환한다', async () => {
      mockBehaviorRepo.deleteOlderThan.mockRejectedValue(new Error('Connection lost'));

      const result = await service.cleanupBehaviorEvents();

      expect(result).toBe(0);
    });
  });

  describe('cleanupCommuteRecords', () => {
    it('기본 보존 기간으로 오래된 기록을 삭제한다', async () => {
      mockCommuteRepo.deleteOlderThan.mockResolvedValue(20);

      const result = await service.cleanupCommuteRecords();

      expect(result).toBe(20);
      const calledDate = mockCommuteRepo.deleteOlderThan.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - DEFAULT_PRIVACY_SETTINGS.retention.commuteRecordsMaxDays);
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('리포지토리가 없으면 0을 반환한다', async () => {
      const serviceWithoutRepo = new DataRetentionService(mockBehaviorRepo, null);

      const result = await serviceWithoutRepo.cleanupCommuteRecords();

      expect(result).toBe(0);
    });

    it('에러 발생 시 0을 반환한다', async () => {
      mockCommuteRepo.deleteOlderThan.mockRejectedValue(new Error('Timeout'));

      const result = await service.cleanupCommuteRecords();

      expect(result).toBe(0);
    });
  });

  describe('deleteAllUserData', () => {
    it('사용자의 모든 데이터를 삭제한다 (GDPR)', async () => {
      mockBehaviorRepo.deleteByUserId.mockResolvedValue(30);
      mockCommuteRepo.deleteByUserId.mockResolvedValue(15);

      const result = await service.deleteAllUserData('user-1');

      expect(result).toEqual({
        behaviorEvents: 30,
        commuteRecords: 15,
      });
      expect(mockBehaviorRepo.deleteByUserId).toHaveBeenCalledWith('user-1');
      expect(mockCommuteRepo.deleteByUserId).toHaveBeenCalledWith('user-1');
    });

    it('리포지토리가 없으면 해당 항목은 0으로 반환한다', async () => {
      const serviceWithoutBehavior = new DataRetentionService(null, mockCommuteRepo);
      mockCommuteRepo.deleteByUserId.mockResolvedValue(5);

      const result = await serviceWithoutBehavior.deleteAllUserData('user-1');

      expect(result.behaviorEvents).toBe(0);
      expect(result.commuteRecords).toBe(5);
    });

    it('두 리포지토리 모두 없으면 0/0을 반환한다', async () => {
      const serviceWithoutRepos = new DataRetentionService(null, null);

      const result = await serviceWithoutRepos.deleteAllUserData('user-1');

      expect(result).toEqual({
        behaviorEvents: 0,
        commuteRecords: 0,
      });
    });
  });
});
