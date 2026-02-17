import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationHistoryController } from './notification-history.controller';
import { NotificationLogEntity } from '../../infrastructure/persistence/typeorm/notification-log.entity';

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
