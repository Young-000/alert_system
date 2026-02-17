import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DevController } from './dev.controller';

// Mock the seed module
jest.mock('@infrastructure/persistence/seeds/sample-data.seed', () => ({
  seedSampleData: jest.fn(),
  clearSampleData: jest.fn(),
  SAMPLE_USER: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: '테스트유저',
    phoneNumber: '01012345678',
    email: 'test@example.com',
    location: { lat: 37.5665, lng: 126.978 },
  },
  SAMPLE_ROUTES: [
    { id: 'route-1', name: '출근 경로 A' },
    { id: 'route-2', name: '퇴근 경로 B' },
  ],
  SAMPLE_ALERTS: [
    { id: 'alert-1', name: '아침 출근 알림', routeId: 'route-1' },
    { id: 'alert-2', name: '저녁 퇴근 알림', routeId: 'route-2' },
  ],
}));

import {
  seedSampleData,
  clearSampleData,
} from '@infrastructure/persistence/seeds/sample-data.seed';

describe('DevController', () => {
  let controller: DevController;
  let mockDataSource: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
      manager: { query: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevController],
      providers: [
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    controller = module.get<DevController>(DevController);

    // 기본적으로 development 환경
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('seedSampleData', () => {
    it('개발 환경에서 샘플 데이터 삽입 성공', async () => {
      (seedSampleData as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.seedSampleData();

      expect(seedSampleData).toHaveBeenCalledWith(mockDataSource);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Sample data seeded successfully');
      expect(result.data).toBeDefined();
    });

    it('프로덕션 환경에서 호출 시 에러', async () => {
      process.env.NODE_ENV = 'production';

      await expect(controller.seedSampleData()).rejects.toThrow(
        'Dev endpoints are not available in production',
      );

      expect(seedSampleData).not.toHaveBeenCalled();
    });

    it('seed 실패 시 에러 정보 반환 (에러 던지지 않음)', async () => {
      (seedSampleData as jest.Mock).mockRejectedValue(new Error('Seed failed'));

      const result = await controller.seedSampleData();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Seed failed');
    });
  });

  describe('clearSampleData', () => {
    it('개발 환경에서 샘플 데이터 삭제 성공', async () => {
      (clearSampleData as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.clearSampleData();

      expect(clearSampleData).toHaveBeenCalledWith(mockDataSource);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Sample data cleared successfully');
    });

    it('프로덕션 환경에서 호출 시 에러', async () => {
      process.env.NODE_ENV = 'production';

      await expect(controller.clearSampleData()).rejects.toThrow(
        'Dev endpoints are not available in production',
      );

      expect(clearSampleData).not.toHaveBeenCalled();
    });

    it('clear 실패 시 에러 정보 반환 (에러 던지지 않음)', async () => {
      (clearSampleData as jest.Mock).mockRejectedValue(new Error('Clear failed'));

      const result = await controller.clearSampleData();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Clear failed');
    });
  });

  describe('getSampleDataInfo', () => {
    it('개발 환경에서 샘플 데이터 정보 조회 성공', () => {
      const result = controller.getSampleDataInfo();

      expect(result).toBeDefined();
      expect((result as any).user).toBeDefined();
      expect((result as any).routes).toBeDefined();
      expect((result as any).alerts).toBeDefined();
      expect((result as any).usage).toBeDefined();
    });

    it('프로덕션 환경에서 호출 시 에러', () => {
      process.env.NODE_ENV = 'production';

      expect(() => controller.getSampleDataInfo()).toThrow(
        'Dev endpoints are not available in production',
      );
    });
  });

  describe('getPhase2Guide', () => {
    it('개발 환경에서 Phase 2 가이드 조회 성공', () => {
      const result = controller.getPhase2Guide();

      expect(result).toBeDefined();
      expect((result as any).title).toBe('Phase 2 기능 테스트 가이드');
      expect((result as any).steps).toBeDefined();
      expect((result as any).steps.length).toBeGreaterThan(0);
      expect((result as any).sampleIds).toBeDefined();
    });

    it('프로덕션 환경에서 호출 시 에러', () => {
      process.env.NODE_ENV = 'production';

      expect(() => controller.getPhase2Guide()).toThrow(
        'Dev endpoints are not available in production',
      );
    });
  });
});
