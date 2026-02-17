import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationHistoryController } from './notification-history.controller';
import { NotificationLogEntity } from '../../infrastructure/persistence/typeorm/notification-log.entity';

function createMockQueryBuilder(getRawManyResult: { status: string; count: number }[] = []) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
  };
  return qb;
}

describe('NotificationHistoryController', () => {
  let controller: NotificationHistoryController;
  let logRepo: jest.Mocked<Repository<NotificationLogEntity>>;

  const OWNER_ID = 'user-123';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  const mockLog = {
    id: 'log-1',
    userId: OWNER_ID,
    alertId: 'alert-1',
    alertName: '출근 알림',
    alertTypes: ['weather', 'bus'],
    status: 'success',
    summary: '맑음, 버스 5분 후 도착',
    sentAt: new Date(),
  };

  beforeEach(async () => {
    logRepo = {
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationHistoryController],
      providers: [
        {
          provide: getRepositoryToken(NotificationLogEntity),
          useValue: logRepo,
        },
      ],
    }).compile();

    controller = module.get<NotificationHistoryController>(NotificationHistoryController);
  });

  describe('getStats', () => {
    it('모든 알림이 성공인 경우 successRate 100 반환', async () => {
      const qb = createMockQueryBuilder([{ status: 'success', count: 10 }]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await controller.getStats(mockRequest(OWNER_ID));

      expect(result).toEqual({
        total: 10,
        success: 10,
        fallback: 0,
        failed: 0,
        successRate: 100,
      });
      expect(qb.where).toHaveBeenCalledWith(
        'log.userId = :userId',
        { userId: OWNER_ID },
      );
    });

    it('혼합 상태 로그에서 올바른 비율 계산 (10 성공, 2 대체, 1 실패)', async () => {
      const qb = createMockQueryBuilder([
        { status: 'success', count: 10 },
        { status: 'fallback', count: 2 },
        { status: 'failed', count: 1 },
      ]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await controller.getStats(mockRequest(OWNER_ID));

      expect(result).toEqual({
        total: 13,
        success: 10,
        fallback: 2,
        failed: 1,
        successRate: 76.9,
      });
    });

    it('모든 알림이 실패인 경우 successRate 0 반환', async () => {
      const qb = createMockQueryBuilder([{ status: 'failed', count: 5 }]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await controller.getStats(mockRequest(OWNER_ID));

      expect(result).toEqual({
        total: 5,
        success: 0,
        fallback: 0,
        failed: 5,
        successRate: 0,
      });
    });

    it('알림 기록이 없으면 total 0, successRate 100 반환', async () => {
      const qb = createMockQueryBuilder([]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await controller.getStats(mockRequest(OWNER_ID));

      expect(result).toEqual({
        total: 0,
        success: 0,
        fallback: 0,
        failed: 0,
        successRate: 100,
      });
    });

    it('days 파라미터가 전달되면 날짜 필터 적용', async () => {
      const qb = createMockQueryBuilder([{ status: 'success', count: 3 }]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await controller.getStats(mockRequest(OWNER_ID), '7');

      expect(qb.andWhere).toHaveBeenCalledWith(
        "log.sentAt >= NOW() - INTERVAL '1 day' * :days",
        { days: 7 },
      );
      expect(result.total).toBe(3);
    });

    it('days 파라미터가 0이면 날짜 필터 미적용', async () => {
      const qb = createMockQueryBuilder([{ status: 'success', count: 5 }]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      await controller.getStats(mockRequest(OWNER_ID), '0');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('잘못된 days 파라미터는 무시 (전체 조회)', async () => {
      const qb = createMockQueryBuilder([{ status: 'success', count: 5 }]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      await controller.getStats(mockRequest(OWNER_ID), 'abc');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('userId로 필터링하여 조회', async () => {
      const qb = createMockQueryBuilder([]);
      logRepo.createQueryBuilder.mockReturnValue(qb as any);

      await controller.getStats(mockRequest('other-user'));

      expect(qb.where).toHaveBeenCalledWith(
        'log.userId = :userId',
        { userId: 'other-user' },
      );
    });
  });

  describe('getHistory', () => {
    it('기본 limit/offset으로 알림 기록 조회', async () => {
      logRepo.findAndCount.mockResolvedValue([[mockLog], 1] as any);

      const result = await controller.getHistory(mockRequest(OWNER_ID));

      expect(logRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: OWNER_ID },
        order: { sentAt: 'DESC' },
        take: 20,
        skip: 0,
      });
      expect(result.items).toEqual([mockLog]);
      expect(result.total).toBe(1);
    });

    it('limit/offset 쿼리 파라미터 적용', async () => {
      logRepo.findAndCount.mockResolvedValue([[], 0] as any);

      await controller.getHistory(mockRequest(OWNER_ID), '10', '5');

      expect(logRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: OWNER_ID },
        order: { sentAt: 'DESC' },
        take: 10,
        skip: 5,
      });
    });

    it('limit가 50을 초과하면 50으로 제한', async () => {
      logRepo.findAndCount.mockResolvedValue([[], 0] as any);

      await controller.getHistory(mockRequest(OWNER_ID), '100', '0');

      expect(logRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('잘못된 limit 문자열 시 기본값 20 사용', async () => {
      logRepo.findAndCount.mockResolvedValue([[], 0] as any);

      await controller.getHistory(mockRequest(OWNER_ID), 'abc', '0');

      expect(logRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });

    it('알림 기록이 없으면 빈 배열과 total 0 반환', async () => {
      logRepo.findAndCount.mockResolvedValue([[], 0] as any);

      const result = await controller.getHistory(mockRequest(OWNER_ID));

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
