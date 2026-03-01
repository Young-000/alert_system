import { CongestionService } from './congestion.service';
import { SegmentCongestion, TimeSlot } from '@domain/entities/segment-congestion.entity';
import { ISegmentCongestionRepository } from '@domain/repositories/segment-congestion.repository';
import { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';
import { CommuteRoute, RouteType, CheckpointType, RouteCheckpoint } from '@domain/entities/commute-route.entity';

describe('CongestionService', () => {
  let service: CongestionService;
  let mockCongestionRepo: jest.Mocked<ISegmentCongestionRepository>;
  let mockRouteRepo: jest.Mocked<ICommuteRouteRepository>;

  beforeEach(() => {
    mockCongestionRepo = {
      findBySegmentKeyAndTimeSlot: jest.fn(),
      findByTimeSlot: jest.fn(),
      findBySegmentKeys: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      deleteAll: jest.fn(),
      countAll: jest.fn(),
    };

    mockRouteRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findPreferredByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    service = new CongestionService(
      mockCongestionRepo,
      mockRouteRepo,
    );
  });

  describe('getSegments', () => {
    it('시간대별 혼잡도 데이터를 반환한다', async () => {
      const mockSegments = [
        createMockCongestion('station_ST001_2호선', 'morning_rush', 'high', 23),
        createMockCongestion('station_ST002_2호선', 'morning_rush', 'low', 18),
      ];
      mockCongestionRepo.findByTimeSlot.mockResolvedValue(mockSegments);

      const result = await service.getSegments({ timeSlot: 'morning_rush' });

      expect(result.timeSlot).toBe('morning_rush');
      expect(result.timeSlotLabel).toBe('오전 러시 (07:00-09:00)');
      expect(result.segments).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('빈 데이터에 대해 빈 배열을 반환한다', async () => {
      mockCongestionRepo.findByTimeSlot.mockResolvedValue([]);

      const result = await service.getSegments({ timeSlot: 'off_peak' });

      expect(result.segments).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('level 필터가 repository에 전달된다', async () => {
      mockCongestionRepo.findByTimeSlot.mockResolvedValue([]);

      await service.getSegments({
        timeSlot: 'morning_rush',
        level: 'high',
        limit: 10,
      });

      expect(mockCongestionRepo.findByTimeSlot).toHaveBeenCalledWith(
        'morning_rush',
        { level: 'high', limit: 10 },
      );
    });
  });

  describe('getRouteCongestion', () => {
    const userId = 'user-123';
    const routeId = 'route-456';

    const mockRoute = new CommuteRoute(userId, '집 → 사무실', RouteType.MORNING, {
      id: routeId,
      checkpoints: [
        new RouteCheckpoint(0, '집', CheckpointType.HOME, { id: 'cp-1' }),
        new RouteCheckpoint(1, '신도림역', CheckpointType.SUBWAY, {
          id: 'cp-2',
          linkedStationId: 'ST001',
          lineInfo: '2호선',
        }),
        new RouteCheckpoint(2, '강남역', CheckpointType.SUBWAY, {
          id: 'cp-3',
          linkedStationId: 'ST002',
          lineInfo: '2호선',
        }),
        new RouteCheckpoint(3, '사무실', CheckpointType.WORK, { id: 'cp-4' }),
      ],
    });

    it('경로의 체크포인트별 혼잡도를 반환한다', async () => {
      mockRouteRepo.findById.mockResolvedValue(mockRoute);
      mockCongestionRepo.findBySegmentKeys.mockResolvedValue([
        createMockCongestion('station_ST001_2호선', 'morning_rush', 'high', 23),
        createMockCongestion('station_ST002_2호선', 'morning_rush', 'low', 18),
      ]);

      const result = await service.getRouteCongestion(routeId, userId, 'morning_rush');

      expect(result.routeId).toBe(routeId);
      expect(result.routeName).toBe('집 → 사무실');
      expect(result.checkpoints).toHaveLength(4);

      // 집과 사무실은 congestion null
      expect(result.checkpoints[0].congestion).toBeNull();
      expect(result.checkpoints[3].congestion).toBeNull();

      // 신도림역 = high, 강남역 = low
      expect(result.checkpoints[1].congestion?.congestionLevel).toBe('high');
      expect(result.checkpoints[2].congestion?.congestionLevel).toBe('low');

      // overall = worst = high
      expect(result.overallCongestion).toBe('high');
    });

    it('다른 사용자의 경로 접근 시 ForbiddenException을 던진다', async () => {
      mockRouteRepo.findById.mockResolvedValue(mockRoute);

      await expect(
        service.getRouteCongestion(routeId, 'other-user', 'morning_rush'),
      ).rejects.toThrow('다른 사용자의 경로에 접근할 수 없습니다.');
    });

    it('존재하지 않는 경로에 대해 NotFoundException을 던진다', async () => {
      mockRouteRepo.findById.mockResolvedValue(undefined);

      await expect(
        service.getRouteCongestion('nonexistent', userId, 'morning_rush'),
      ).rejects.toThrow('경로를 찾을 수 없습니다.');
    });

    it('혼잡도 데이터가 없으면 모든 체크포인트가 congestion null이다', async () => {
      mockRouteRepo.findById.mockResolvedValue(mockRoute);
      mockCongestionRepo.findBySegmentKeys.mockResolvedValue([]);

      const result = await service.getRouteCongestion(routeId, userId, 'morning_rush');

      result.checkpoints.forEach((cp) => {
        expect(cp.congestion).toBeNull();
      });
      expect(result.overallCongestion).toBe('low');
      expect(result.totalEstimatedDelay).toBe(0);
    });

    it('sample 3개 미만인 세그먼트는 congestion null이다', async () => {
      mockRouteRepo.findById.mockResolvedValue(mockRoute);
      mockCongestionRepo.findBySegmentKeys.mockResolvedValue([
        createMockCongestion('station_ST001_2호선', 'morning_rush', 'high', 2), // 2 samples - not enough
      ]);

      const result = await service.getRouteCongestion(routeId, userId, 'morning_rush');

      // 신도림역은 sample 부족으로 null
      expect(result.checkpoints[1].congestion).toBeNull();
    });
  });
});

function createMockCongestion(
  segmentKey: string,
  timeSlot: TimeSlot,
  level: 'low' | 'moderate' | 'high' | 'severe',
  sampleCount: number,
): SegmentCongestion {
  return new SegmentCongestion({
    id: `mock-${segmentKey}`,
    segmentKey,
    checkpointName: segmentKey.split('_')[1] || 'test',
    checkpointType: 'subway',
    timeSlot,
    avgWaitMinutes: level === 'low' ? 2 : level === 'moderate' ? 4 : level === 'high' ? 7 : 12,
    avgDelayMinutes: level === 'low' ? 1 : level === 'moderate' ? 3 : level === 'high' ? 6 : 11,
    stdDevMinutes: 2,
    sampleCount,
    congestionLevel: level,
    confidence: sampleCount > 10 ? 0.78 : 0.45,
    lastUpdatedAt: new Date(),
  });
}
