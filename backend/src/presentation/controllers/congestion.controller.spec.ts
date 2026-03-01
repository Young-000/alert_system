import { CongestionController } from './congestion.controller';
import { CongestionService } from '@application/services/congestion/congestion.service';
import { CongestionAggregationService } from '@application/services/congestion/congestion-aggregation.service';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

describe('CongestionController', () => {
  let controller: CongestionController;
  let mockGetSegments: jest.Mock;
  let mockGetRouteCongestion: jest.Mock;
  let mockRecalculateAll: jest.Mock;

  beforeEach(() => {
    mockGetSegments = jest.fn();
    mockGetRouteCongestion = jest.fn();
    mockRecalculateAll = jest.fn();

    const mockCongestionService = {
      getSegments: mockGetSegments,
      getRouteCongestion: mockGetRouteCongestion,
    } as unknown as CongestionService;

    const mockAggregationService = {
      recalculateAll: mockRecalculateAll,
    } as unknown as CongestionAggregationService;

    controller = new CongestionController(
      mockCongestionService,
      mockAggregationService,
    );
  });

  describe('GET /congestion/segments', () => {
    it('시간대별 혼잡도 데이터를 반환한다', async () => {
      const mockResponse = {
        timeSlot: 'morning_rush' as const,
        timeSlotLabel: '오전 러시 (07:00-09:00)',
        segments: [],
        totalCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      };
      mockGetSegments.mockResolvedValue(mockResponse);

      const result = await controller.getSegments('morning_rush');

      expect(result.timeSlot).toBe('morning_rush');
      expect(mockGetSegments).toHaveBeenCalledWith({
        timeSlot: 'morning_rush',
        level: undefined,
        limit: 50,
      });
    });

    it('유효하지 않은 timeSlot은 undefined로 전달된다', async () => {
      const mockResponse = {
        timeSlot: 'morning_rush' as const,
        timeSlotLabel: '오전 러시 (07:00-09:00)',
        segments: [],
        totalCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      };
      mockGetSegments.mockResolvedValue(mockResponse);

      await controller.getSegments('invalid_slot');

      expect(mockGetSegments).toHaveBeenCalledWith({
        timeSlot: undefined,
        level: undefined,
        limit: 50,
      });
    });

    it('level 필터를 전달한다', async () => {
      const mockResponse = {
        timeSlot: 'morning_rush' as const,
        timeSlotLabel: '오전 러시 (07:00-09:00)',
        segments: [],
        totalCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      };
      mockGetSegments.mockResolvedValue(mockResponse);

      await controller.getSegments('morning_rush', 'high', '10');

      expect(mockGetSegments).toHaveBeenCalledWith({
        timeSlot: 'morning_rush',
        level: 'high',
        limit: 10,
      });
    });

    it('limit이 200을 초과하면 200으로 제한한다', async () => {
      const mockResponse = {
        timeSlot: 'morning_rush' as const,
        timeSlotLabel: '오전 러시 (07:00-09:00)',
        segments: [],
        totalCount: 0,
        lastCalculatedAt: new Date().toISOString(),
      };
      mockGetSegments.mockResolvedValue(mockResponse);

      await controller.getSegments('morning_rush', undefined, '500');

      expect(mockGetSegments).toHaveBeenCalledWith({
        timeSlot: 'morning_rush',
        level: undefined,
        limit: 200,
      });
    });
  });

  describe('GET /congestion/routes/:routeId', () => {
    it('경로별 혼잡도 데이터를 반환한다', async () => {
      const mockResponse = {
        routeId: 'route-123',
        routeName: '집 → 사무실',
        timeSlot: 'morning_rush' as const,
        timeSlotLabel: '오전 러시 (07:00-09:00)',
        checkpoints: [],
        overallCongestion: 'moderate' as const,
        totalEstimatedDelay: 3.5,
        lastCalculatedAt: new Date().toISOString(),
      };
      mockGetRouteCongestion.mockResolvedValue(mockResponse);

      const mockReq = { user: { userId: 'user-123', email: 'test@test.com' } } as AuthenticatedRequest;

      const result = await controller.getRouteCongestion('route-123', 'morning_rush', mockReq);

      expect(result.routeId).toBe('route-123');
      expect(mockGetRouteCongestion).toHaveBeenCalledWith(
        'route-123',
        'user-123',
        'morning_rush',
      );
    });
  });

  describe('POST /congestion/recalculate', () => {
    it('전체 재계산을 트리거하고 결과를 반환한다', async () => {
      mockRecalculateAll.mockResolvedValue({
        segmentCount: 42,
        elapsed: 1234,
      });

      const result = await controller.recalculate();

      expect(result.status).toBe('completed');
      expect(result.segmentCount).toBe(42);
      expect(result.elapsedMs).toBe(1234);
    });
  });
});
