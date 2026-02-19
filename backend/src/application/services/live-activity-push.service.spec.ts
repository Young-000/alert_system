import { LiveActivityPushService } from './live-activity-push.service';
import type {
  LiveActivityPushPayload,
  LiveActivityContentState,
} from './live-activity-push.service';

describe('LiveActivityPushService', () => {
  let service: LiveActivityPushService;

  beforeEach(() => {
    service = new LiveActivityPushService();
  });

  describe('buildContentState', () => {
    it('필수 필드만으로 content-state 생성', () => {
      const params = {
        optimalDepartureAt: new Date('2026-02-20T07:45:00Z'),
        estimatedTravelMin: 45,
        status: 'preparing',
        minutesUntilDeparture: 30,
        hasTrafficDelay: false,
      };

      const result = service.buildContentState(params);

      expect(result.optimalDepartureAt).toBe('2026-02-20T07:45:00.000Z');
      expect(result.estimatedTravelMin).toBe(45);
      expect(result.status).toBe('preparing');
      expect(result.minutesUntilDeparture).toBe(30);
      expect(result.hasTrafficDelay).toBe(false);
      expect(result.minutesUntilArrival).toBeNull();
      expect(result.currentCheckpointIndex).toBeNull();
      expect(result.nextCheckpoint).toBeNull();
      expect(result.nextTransitInfo).toBeNull();
      expect(result.trafficDelayMessage).toBeNull();
      expect(result.estimatedArrivalTime).toBeNull();
      expect(result.updatedAt).toBeDefined();
    });

    it('모든 필드를 포함하여 content-state 생성', () => {
      const params = {
        optimalDepartureAt: new Date('2026-02-20T07:45:00Z'),
        estimatedTravelMin: 50,
        status: 'inTransit',
        minutesUntilDeparture: 0,
        minutesUntilArrival: 32,
        currentCheckpointIndex: 1,
        nextCheckpoint: '강남역 2호선',
        nextTransitInfo: '2호선 3분 뒤',
        hasTrafficDelay: true,
        trafficDelayMessage: '2호선 약간 지연',
        estimatedArrivalTime: '09:02',
      };

      const result = service.buildContentState(params);

      expect(result.minutesUntilArrival).toBe(32);
      expect(result.currentCheckpointIndex).toBe(1);
      expect(result.nextCheckpoint).toBe('강남역 2호선');
      expect(result.nextTransitInfo).toBe('2호선 3분 뒤');
      expect(result.hasTrafficDelay).toBe(true);
      expect(result.trafficDelayMessage).toBe('2호선 약간 지연');
      expect(result.estimatedArrivalTime).toBe('09:02');
    });

    it('updatedAt이 현재 시각에 가까운 ISO 문자열', () => {
      const before = Date.now();

      const result = service.buildContentState({
        optimalDepartureAt: new Date(),
        estimatedTravelMin: 30,
        status: 'preparing',
        minutesUntilDeparture: 15,
        hasTrafficDelay: false,
      });

      const after = Date.now();
      const updatedAtMs = new Date(result.updatedAt).getTime();
      expect(updatedAtMs).toBeGreaterThanOrEqual(before);
      expect(updatedAtMs).toBeLessThanOrEqual(after);
    });
  });

  describe('sendUpdate', () => {
    it('스텁: 항상 true를 반환 (로그만 출력)', async () => {
      const payload: LiveActivityPushPayload = {
        aps: {
          timestamp: Math.floor(Date.now() / 1000),
          event: 'update',
          'content-state': {
            optimalDepartureAt: '2026-02-20T07:45:00.000Z',
            estimatedTravelMin: 45,
            status: 'preparing',
            minutesUntilDeparture: 30,
            minutesUntilArrival: null,
            currentCheckpointIndex: null,
            nextCheckpoint: null,
            nextTransitInfo: null,
            hasTrafficDelay: false,
            trafficDelayMessage: null,
            estimatedArrivalTime: null,
            updatedAt: new Date().toISOString(),
          },
        },
      };

      const result = await service.sendUpdate('push-token-abc123', payload);

      expect(result).toBe(true);
    });

    it('end 이벤트도 처리 가능', async () => {
      const payload: LiveActivityPushPayload = {
        aps: {
          timestamp: Math.floor(Date.now() / 1000),
          event: 'end',
          'content-state': {
            optimalDepartureAt: '2026-02-20T07:45:00.000Z',
            estimatedTravelMin: 45,
            status: 'arrived',
            minutesUntilDeparture: 0,
            minutesUntilArrival: 0,
            currentCheckpointIndex: 2,
            nextCheckpoint: null,
            nextTransitInfo: null,
            hasTrafficDelay: false,
            trafficDelayMessage: null,
            estimatedArrivalTime: '09:00',
            updatedAt: new Date().toISOString(),
          },
          'dismissal-date': Math.floor(Date.now() / 1000) + 10,
        },
      };

      const result = await service.sendUpdate('push-token-abc123', payload);

      expect(result).toBe(true);
    });
  });

  describe('sendEnd', () => {
    it('종료 페이로드를 올바르게 구성하여 전송', async () => {
      const contentState: LiveActivityContentState = {
        optimalDepartureAt: '2026-02-20T07:45:00.000Z',
        estimatedTravelMin: 45,
        status: 'arrived',
        minutesUntilDeparture: 0,
        minutesUntilArrival: 0,
        currentCheckpointIndex: null,
        nextCheckpoint: null,
        nextTransitInfo: null,
        hasTrafficDelay: false,
        trafficDelayMessage: null,
        estimatedArrivalTime: '09:00',
        updatedAt: new Date().toISOString(),
      };

      const dismissalDate = Math.floor(Date.now() / 1000) + 10;
      const result = await service.sendEnd(
        'push-token-abc123',
        contentState,
        dismissalDate,
      );

      expect(result).toBe(true);
    });

    it('dismissalDate 없이도 종료 전송 가능', async () => {
      const contentState: LiveActivityContentState = {
        optimalDepartureAt: '2026-02-20T07:45:00.000Z',
        estimatedTravelMin: 45,
        status: 'arrived',
        minutesUntilDeparture: 0,
        minutesUntilArrival: null,
        currentCheckpointIndex: null,
        nextCheckpoint: null,
        nextTransitInfo: null,
        hasTrafficDelay: false,
        trafficDelayMessage: null,
        estimatedArrivalTime: null,
        updatedAt: new Date().toISOString(),
      };

      const result = await service.sendEnd('push-token-abc123', contentState);

      expect(result).toBe(true);
    });
  });
});
