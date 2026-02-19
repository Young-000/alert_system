import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { LiveActivityController } from './live-activity.controller';
import { LiveActivityTokenEntity } from '../../infrastructure/persistence/typeorm/live-activity-token.entity';

describe('LiveActivityController', () => {
  let controller: LiveActivityController;
  let tokenRepo: jest.Mocked<Repository<LiveActivityTokenEntity>>;

  const OWNER_ID = 'user-123';

  const mockRequest = (userId: string) =>
    ({
      user: { userId, email: `${userId}@test.com` },
    }) as any;

  beforeEach(async () => {
    tokenRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveActivityController],
      providers: [
        {
          provide: getRepositoryToken(LiveActivityTokenEntity),
          useValue: tokenRepo,
        },
      ],
    }).compile();

    controller = module.get<LiveActivityController>(LiveActivityController);
  });

  describe('register', () => {
    const registerDto = {
      pushToken: 'base64-push-token-abc123',
      activityId: 'activity-001',
      mode: 'commute' as const,
      settingId: 'setting-uuid-123',
    };

    it('새 Live Activity 토큰 등록 성공', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 0 } as any);
      tokenRepo.findOne.mockResolvedValue(null);
      tokenRepo.save.mockResolvedValue({
        id: 'token-uuid-1',
        userId: OWNER_ID,
        ...registerDto,
        isActive: true,
        settingId: registerDto.settingId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await controller.register(
        mockRequest(OWNER_ID),
        registerDto as any,
      );

      expect(result).toEqual({
        id: 'token-uuid-1',
        registered: true,
      });
      expect(tokenRepo.update).toHaveBeenCalledWith(
        { userId: OWNER_ID, isActive: true },
        { isActive: false },
      );
      expect(tokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: OWNER_ID,
          activityId: 'activity-001',
          pushToken: 'base64-push-token-abc123',
          mode: 'commute',
          isActive: true,
        }),
      );
    });

    it('기존 activityId가 있으면 업데이트 (upsert)', async () => {
      const existing = {
        id: 'existing-token-1',
        userId: 'old-user',
        activityId: 'activity-001',
        pushToken: 'old-token',
        mode: 'return',
        settingId: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tokenRepo.update.mockResolvedValue({ affected: 0 } as any);
      tokenRepo.findOne.mockResolvedValue(existing as any);
      tokenRepo.save.mockResolvedValue(existing as any);

      const result = await controller.register(
        mockRequest(OWNER_ID),
        registerDto as any,
      );

      expect(result).toEqual({
        id: 'existing-token-1',
        registered: true,
      });
      expect(existing.userId).toBe(OWNER_ID);
      expect(existing.pushToken).toBe('base64-push-token-abc123');
      expect(existing.mode).toBe('commute');
      expect(existing.isActive).toBe(true);
    });

    it('settingId 없이도 등록 가능', async () => {
      const dtoWithoutSetting = {
        pushToken: 'base64-push-token-abc123',
        activityId: 'activity-002',
        mode: 'return' as const,
      };
      tokenRepo.update.mockResolvedValue({ affected: 0 } as any);
      tokenRepo.findOne.mockResolvedValue(null);
      tokenRepo.save.mockResolvedValue({
        id: 'token-uuid-2',
        ...dtoWithoutSetting,
        userId: OWNER_ID,
        settingId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await controller.register(
        mockRequest(OWNER_ID),
        dtoWithoutSetting as any,
      );

      expect(result.registered).toBe(true);
      expect(tokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settingId: null,
        }),
      );
    });

    it('등록 시 기존 활성 토큰을 비활성화함', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 1 } as any);
      tokenRepo.findOne.mockResolvedValue(null);
      tokenRepo.save.mockResolvedValue({
        id: 'token-uuid-3',
        userId: OWNER_ID,
        ...registerDto,
        settingId: registerDto.settingId ?? null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await controller.register(mockRequest(OWNER_ID), registerDto as any);

      expect(tokenRepo.update).toHaveBeenCalledWith(
        { userId: OWNER_ID, isActive: true },
        { isActive: false },
      );
    });
  });

  describe('deactivate', () => {
    it('Live Activity 토큰 비활성화 성공', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 1 } as any);

      await controller.deactivate('activity-001', mockRequest(OWNER_ID));

      expect(tokenRepo.update).toHaveBeenCalledWith(
        { activityId: 'activity-001', userId: OWNER_ID },
        { isActive: false },
      );
    });

    it('존재하지 않는 activityId면 NotFoundException', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 0 } as any);

      await expect(
        controller.deactivate('non-existent', mockRequest(OWNER_ID)),
      ).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 토큰은 비활성화 불가', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 0 } as any);

      await expect(
        controller.deactivate('activity-001', mockRequest('other-user')),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActive', () => {
    it('활성 Live Activity 토큰 조회 성공', async () => {
      const activeToken = {
        id: 'token-uuid-1',
        activityId: 'activity-001',
        mode: 'commute',
        settingId: 'setting-uuid-123',
        isActive: true,
        createdAt: new Date('2026-02-20T08:00:00Z'),
        updatedAt: new Date('2026-02-20T08:00:00Z'),
      };
      tokenRepo.findOne.mockResolvedValue(activeToken as any);

      const result = await controller.getActive(mockRequest(OWNER_ID));

      expect(result).toEqual({
        id: 'token-uuid-1',
        activityId: 'activity-001',
        mode: 'commute',
        settingId: 'setting-uuid-123',
        isActive: true,
        createdAt: '2026-02-20T08:00:00.000Z',
        updatedAt: '2026-02-20T08:00:00.000Z',
      });
      expect(tokenRepo.findOne).toHaveBeenCalledWith({
        where: { userId: OWNER_ID, isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('활성 토큰이 없으면 null 반환', async () => {
      tokenRepo.findOne.mockResolvedValue(null);

      const result = await controller.getActive(mockRequest(OWNER_ID));

      expect(result).toBeNull();
    });
  });
});
