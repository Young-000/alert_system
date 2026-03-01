import { RouteDelayCheckService } from './route-delay-check.service';
import { CommuteRoute, RouteCheckpoint, CheckpointType, RouteType } from '@domain/entities/commute-route.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

describe('RouteDelayCheckService', () => {
  let service: RouteDelayCheckService;
  let mockSubwayClient: jest.Mocked<ISubwayApiClient>;

  beforeEach(() => {
    mockSubwayClient = {
      getSubwayArrival: jest.fn(),
    };
    service = new RouteDelayCheckService(mockSubwayClient);
  });

  function createRoute(checkpoints: RouteCheckpoint[]): CommuteRoute {
    return new CommuteRoute('user-1', '출근 경로', RouteType.MORNING, {
      id: 'route-1',
      checkpoints,
      totalExpectedDuration: 45,
    });
  }

  function createSubwayCheckpoint(
    name: string,
    lineInfo: string,
    expectedWait: number,
    id = 'cp-1',
  ): RouteCheckpoint {
    return new RouteCheckpoint(1, name, CheckpointType.SUBWAY, {
      id,
      lineInfo,
      expectedWaitTime: expectedWait,
      linkedStationId: 'station-1',
    });
  }

  describe('checkRouteDelays', () => {
    it('경로에 대중교통 체크포인트가 없으면 normal 상태를 반환한다', async () => {
      const homeCheckpoint = new RouteCheckpoint(1, '집', CheckpointType.HOME, { id: 'cp-home' });
      const workCheckpoint = new RouteCheckpoint(2, '회사', CheckpointType.WORK, { id: 'cp-work' });
      const route = createRoute([homeCheckpoint, workCheckpoint]);

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('normal');
      expect(result.segments).toHaveLength(0);
      expect(result.totalDelayMinutes).toBe(0);
      expect(mockSubwayClient.getSubwayArrival).not.toHaveBeenCalled();
    });

    it('지하철 도착 시간이 예상 범위 내이면 normal 상태를 반환한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // API returns arrival in 180 seconds (3 minutes) -> matches expected 3min
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 180, '서울대입구'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('normal');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].status).toBe('normal');
      expect(result.segments[0].delayMinutes).toBe(0);
    });

    it('지하철이 지연되면 delayed 상태를 반환한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // API returns arrival in 840 seconds (14 minutes) vs expected 3min -> +11min delay
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 840, '서울대입구'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('delayed');
      expect(result.segments[0].status).toBe('severe_delay');
      expect(result.segments[0].delayMinutes).toBe(11);
      expect(result.segments[0].estimatedWaitMinutes).toBe(14);
      expect(result.segments[0].source).toBe('realtime_api');
    });

    it('심각한 지연(15분 이상)이면 severe_delay 상태를 반환한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // 20 minutes wait -> 17min delay
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 1200, '서울대입구'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('severe_delay');
      expect(result.segments[0].status).toBe('severe_delay');
      expect(result.segments[0].delayMinutes).toBe(17);
    });

    it('API 오류 시 unavailable 상태를 반환한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      mockSubwayClient.getSubwayArrival.mockRejectedValue(
        new Error('API 호출 실패'),
      );

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('unavailable');
      expect(result.segments[0].status).toBe('unavailable');
      expect(result.segments[0].delayMinutes).toBe(0);
    });

    it('여러 체크포인트 중 하나만 지연되면 전체 상태는 가장 높은 지연 기준으로 결정된다', async () => {
      const cp1 = createSubwayCheckpoint('강남역', '2호선', 3, 'cp-1');
      const cp2 = createSubwayCheckpoint('신도림역', '1호선', 5, 'cp-2');
      const route = createRoute([cp1, cp2]);

      // 강남: 14min wait (11min delay)
      mockSubwayClient.getSubwayArrival.mockResolvedValueOnce([
        new SubwayArrival('st-1', '1002', '상행', 840, '서울대입구'),
      ]);
      // 신도림: 6min wait (1min delay -> normal)
      mockSubwayClient.getSubwayArrival.mockResolvedValueOnce([
        new SubwayArrival('st-2', '1001', '상행', 360, '인천'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.overallStatus).toBe('delayed');
      expect(result.segments).toHaveLength(2);
      expect(result.totalDelayMinutes).toBe(12);
    });

    it('일부 API 실패 시 다른 체크포인트는 정상 처리된다', async () => {
      const cp1 = createSubwayCheckpoint('강남역', '2호선', 3, 'cp-1');
      const cp2 = createSubwayCheckpoint('신도림역', '1호선', 5, 'cp-2');
      const route = createRoute([cp1, cp2]);

      // 강남: API 실패
      mockSubwayClient.getSubwayArrival.mockRejectedValueOnce(new Error('fail'));
      // 신도림: 정상
      mockSubwayClient.getSubwayArrival.mockResolvedValueOnce([
        new SubwayArrival('st-2', '1001', '상행', 300, '인천'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].status).toBe('unavailable');
      expect(result.segments[1].status).toBe('normal');
      expect(result.overallStatus).toBe('minor_delay');
    });

    it('도착 정보가 없으면 estimated 소스로 normal을 반환한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // No matching arrivals
      mockSubwayClient.getSubwayArrival.mockResolvedValue([]);

      const result = await service.checkRouteDelays(route);

      expect(result.segments[0].source).toBe('estimated');
      expect(result.segments[0].status).toBe('normal');
      expect(result.segments[0].estimatedWaitMinutes).toBe(3);
    });

    it('minor delay(2-5분 차이)를 정확히 분류한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // 6min wait vs 3min expected = 3min delay (delayed, not minor_delay at segment level)
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 360, '서울대입구'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.segments[0].status).toBe('delayed');
      expect(result.segments[0].delayMinutes).toBe(3);
      // Overall status: 3min delay -> minor_delay (between 2 and 5)
      expect(result.overallStatus).toBe('minor_delay');
    });

    it('transfer_point 타입 체크포인트도 지연 체크 대상이다', async () => {
      const checkpoint = new RouteCheckpoint(1, '교대역', CheckpointType.TRANSFER_POINT, {
        id: 'cp-transfer',
        lineInfo: '3호선',
        expectedWaitTime: 4,
      });
      const route = createRoute([checkpoint]);

      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1003', '상행', 240, '오금'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].checkpointType).toBe('transfer_point');
    });

    it('totalExpectedDuration과 totalEstimatedDuration을 올바르게 계산한다', async () => {
      const checkpoint = createSubwayCheckpoint('강남역', '2호선', 3);
      const route = createRoute([checkpoint]);

      // 10min delay
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 780, '서울대입구'),
      ]);

      const result = await service.checkRouteDelays(route);

      expect(result.totalExpectedDuration).toBe(45);
      expect(result.totalEstimatedDuration).toBe(55);
      expect(result.totalDelayMinutes).toBe(10);
    });
  });
});
