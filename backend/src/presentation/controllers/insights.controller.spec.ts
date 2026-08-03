import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InsightsController } from './insights.controller';
import { InsightsService } from '@application/services/insights/insights.service';
import { InsightsAggregationService } from '@application/services/insights/insights-aggregation.service';

describe('InsightsController', () => {
  let controller: InsightsController;
  let insightsService: jest.Mocked<InsightsService>;
  let aggregationService: jest.Mocked<InsightsAggregationService>;
  let configService: { get: jest.Mock };

  const emptyRegions = {
    regions: [],
    meta: { total: 0, limit: 20, offset: 0, totalPages: 0 },
  };

  beforeEach(async () => {
    insightsService = {
      getRegions: jest.fn().mockResolvedValue(emptyRegions),
      getRegionById: jest.fn(),
      getRegionTrends: jest.fn(),
      getRegionPeakHours: jest.fn(),
      getMyComparison: jest.fn(),
    } as any;

    aggregationService = {
      recalculateAll: jest.fn().mockResolvedValue({ regionCount: 0, elapsed: 1 }),
    } as any;

    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [
        { provide: InsightsService, useValue: insightsService },
        { provide: InsightsAggregationService, useValue: aggregationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<InsightsController>(InsightsController);
  });

  describe('GET /insights/regions — 페이지네이션 파라미터', () => {
    it('파라미터가 없으면 기본값(limit 20, offset 0)을 쓴다', async () => {
      await controller.getRegions();

      expect(insightsService.getRegions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('limit 상한 100을 넘기면 100으로 잘린다', async () => {
      await controller.getRegions(undefined, '5000');

      expect(insightsService.getRegions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    // 이 엔드포인트는 @Public() — 인증 없이 누구나 호출한다.
    // 음수 limit이 그대로 통과하면 TypeORM이 `LIMIT -1`을 그대로 실어 보내고,
    // Postgres는 "LIMIT must not be negative"로 500을 낸다.
    it('음수 limit은 SQL로 새어나가지 않는다', async () => {
      await controller.getRegions(undefined, '-1');

      const passed = insightsService.getRegions.mock.calls[0][0];
      expect(passed.limit).toBeGreaterThan(0);
    });

    it('음수 offset은 SQL로 새어나가지 않는다', async () => {
      await controller.getRegions(undefined, undefined, '-10');

      const passed = insightsService.getRegions.mock.calls[0][0];
      expect(passed.offset).toBeGreaterThanOrEqual(0);
    });

    it('limit=0도 유효한 페이지 크기로 보정된다', async () => {
      await controller.getRegions(undefined, '0');

      const passed = insightsService.getRegions.mock.calls[0][0];
      expect(passed.limit).toBeGreaterThan(0);
    });

    it('숫자가 아닌 limit은 기본값으로 되돌아간다', async () => {
      await controller.getRegions(undefined, 'drop-table');

      expect(insightsService.getRegions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    it('허용 목록에 없는 sortBy는 무시된다', async () => {
      await controller.getRegions('; DELETE FROM regional_insights');

      expect(insightsService.getRegions).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: undefined }),
      );
    });
  });

  describe('POST /insights/recalculate — 스케줄러 시크릿', () => {
    it('시크릿이 서버에 설정돼 있지 않으면 거부한다', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(controller.recalculate('anything')).rejects.toThrow(
        'Authentication failed',
      );
      expect(aggregationService.recalculateAll).not.toHaveBeenCalled();
    });

    it('시크릿이 틀리면 거부한다', async () => {
      configService.get.mockReturnValue('correct-secret');

      await expect(controller.recalculate('wrong-secret')).rejects.toThrow(
        'Authentication failed',
      );
      expect(aggregationService.recalculateAll).not.toHaveBeenCalled();
    });

    it('시크릿이 맞으면 재계산을 실행한다', async () => {
      configService.get.mockReturnValue('correct-secret');

      const result = await controller.recalculate('correct-secret');

      expect(aggregationService.recalculateAll).toHaveBeenCalled();
      expect(result.status).toBe('completed');
    });
  });
});
