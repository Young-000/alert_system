import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushController } from './push.controller';
import { PushSubscriptionEntity } from '../../infrastructure/persistence/typeorm/push-subscription.entity';

describe('PushController', () => {
  let controller: PushController;
  let subscriptionRepo: jest.Mocked<Repository<PushSubscriptionEntity>>;

  const OWNER_ID = 'user-123';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    subscriptionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushController],
      providers: [
        {
          provide: getRepositoryToken(PushSubscriptionEntity),
          useValue: subscriptionRepo,
        },
      ],
    }).compile();

    controller = module.get<PushController>(PushController);
  });

  describe('subscribe', () => {
    const subscribeDto = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: {
        p256dh: 'BNcR-key',
        auth: 'auth-key',
      },
    };

    it('새 구독 생성 성공', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);
      subscriptionRepo.save.mockResolvedValue({} as any);

      const result = await controller.subscribe(mockRequest(OWNER_ID), subscribeDto as any);

      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { endpoint: subscribeDto.endpoint },
      });
      expect(subscriptionRepo.save).toHaveBeenCalledWith({
        userId: OWNER_ID,
        endpoint: subscribeDto.endpoint,
        keys: JSON.stringify({ p256dh: 'BNcR-key', auth: 'auth-key' }),
      });
      expect(result).toEqual({ success: true });
    });

    it('기존 구독이 있으면 업데이트 (upsert)', async () => {
      const existing = {
        id: 'sub-1',
        userId: 'old-user',
        endpoint: subscribeDto.endpoint,
        keys: 'old-keys',
      };
      subscriptionRepo.findOne.mockResolvedValue(existing as any);
      subscriptionRepo.save.mockResolvedValue({} as any);

      const result = await controller.subscribe(mockRequest(OWNER_ID), subscribeDto as any);

      expect(subscriptionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub-1',
          userId: OWNER_ID,
          keys: JSON.stringify({ p256dh: 'BNcR-key', auth: 'auth-key' }),
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('기존 구독 업데이트 시 userId가 현재 사용자로 변경됨', async () => {
      const existing = {
        id: 'sub-1',
        userId: 'another-user',
        endpoint: subscribeDto.endpoint,
        keys: 'old-keys',
      };
      subscriptionRepo.findOne.mockResolvedValue(existing as any);
      subscriptionRepo.save.mockResolvedValue({} as any);

      await controller.subscribe(mockRequest(OWNER_ID), subscribeDto as any);

      // existing 객체가 직접 변경됨
      expect(existing.userId).toBe(OWNER_ID);
    });
  });

  describe('unsubscribe', () => {
    const unsubscribeDto = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    };

    it('구독 해제 성공', async () => {
      subscriptionRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.unsubscribe(mockRequest(OWNER_ID), unsubscribeDto as any);

      expect(subscriptionRepo.delete).toHaveBeenCalledWith({
        userId: OWNER_ID,
        endpoint: unsubscribeDto.endpoint,
      });
      expect(result).toEqual({ success: true });
    });

    it('존재하지 않는 구독 해제 시에도 success: true 반환', async () => {
      subscriptionRepo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await controller.unsubscribe(mockRequest(OWNER_ID), unsubscribeDto as any);

      expect(result).toEqual({ success: true });
    });
  });
});
