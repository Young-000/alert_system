import { ProcessCommuteEventUseCase } from './process-commute-event.use-case';
import { UserPlace } from '@domain/entities/user-place.entity';
import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';
import type { RecordCommuteEventDto } from '@application/dto/commute-event.dto';

/**
 * 오프라인 배치 업로드(`POST /commute/events/batch`)의 부분 실패 규약.
 *
 * 모바일(`geofence.service.syncOfflineEvents`)은 업로드가 **throw하면 큐를 그대로 둔다.**
 * 따라서 배치 안의 이벤트 하나가 영구 실패(삭제된 장소 → 404)하면
 * 그 큐는 다시는 비워지지 않고 지오펜스 기록이 조용히 멈춘다.
 * 배치는 개별 이벤트 실패를 흡수하고 나머지를 처리해야 한다.
 */
describe('ProcessCommuteEventUseCase - 배치 부분 실패', () => {
  const USER_ID = 'user-1';
  const HOME_PLACE_ID = '11111111-1111-4111-8111-111111111111';
  const WORK_PLACE_ID = '22222222-2222-4222-8222-222222222222';
  const DELETED_PLACE_ID = '33333333-3333-4333-8333-333333333333';
  const OTHER_USER_PLACE_ID = '44444444-4444-4444-8444-444444444444';

  let useCase: ProcessCommuteEventUseCase;
  let eventRepository: {
    save: jest.Mock;
    saveBatch: jest.Mock;
    findById: jest.Mock;
    findByUserId: jest.Mock;
    findRecent: jest.Mock;
    markProcessed: jest.Mock;
    update: jest.Mock;
  };
  let sessionRepository: {
    save: jest.Mock;
    update: jest.Mock;
    findInProgressByUserId: jest.Mock;
  };
  let routeRepository: {
    findPreferredByUserId: jest.Mock;
    findByUserIdAndType: jest.Mock;
    findByUserId: jest.Mock;
  };
  let placeRepository: { findById: jest.Mock; findByIds: jest.Mock };

  const makePlace = (id: string, placeType: 'home' | 'work', ownerId = USER_ID): UserPlace =>
    new UserPlace(ownerId, placeType, placeType === 'home' ? '집' : '회사', 37.5, 127.0, { id });

  const dto = (
    placeId: string,
    eventType: 'enter' | 'exit',
    triggeredAt: string,
  ): RecordCommuteEventDto =>
    ({ placeId, eventType, triggeredAt }) as RecordCommuteEventDto;

  beforeEach(() => {
    eventRepository = {
      save: jest.fn(async (event) => event),
      saveBatch: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findRecent: jest.fn(async () => undefined),
      markProcessed: jest.fn(async () => undefined),
      update: jest.fn(async () => undefined),
    };
    sessionRepository = {
      save: jest.fn(async (session) => session),
      update: jest.fn(async () => undefined),
      findInProgressByUserId: jest.fn(async () => undefined),
    };
    routeRepository = {
      findPreferredByUserId: jest.fn(
        async () => new CommuteRoute(USER_ID, '출근 경로', RouteType.MORNING, { id: 'route-1' }),
      ),
      findByUserIdAndType: jest.fn(async () => []),
      findByUserId: jest.fn(async () => []),
    };
    placeRepository = {
      findById: jest.fn(async (id: string) => {
        if (id === HOME_PLACE_ID) return makePlace(HOME_PLACE_ID, 'home');
        if (id === WORK_PLACE_ID) return makePlace(WORK_PLACE_ID, 'work');
        if (id === OTHER_USER_PLACE_ID) {
          return makePlace(OTHER_USER_PLACE_ID, 'home', 'someone-else');
        }
        return undefined; // DELETED_PLACE_ID
      }),
      findByIds: jest.fn(async () => []),
    };

    useCase = new ProcessCommuteEventUseCase(
      eventRepository as never,
      sessionRepository as never,
      routeRepository as never,
      placeRepository as never,
    );
  });

  it('삭제된 장소를 참조하는 이벤트가 있어도 배치 전체를 실패시키지 않는다', async () => {
    const result = await useCase.processBatch(USER_ID, [
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T07:30:00+09:00'),
      dto(DELETED_PLACE_ID, 'enter', '2026-07-30T08:00:00+09:00'),
      dto(WORK_PLACE_ID, 'enter', '2026-07-30T08:30:00+09:00'),
    ]);

    // 정상 이벤트 2건은 처리된다 (출근 시작 + 출근 완료)
    expect(result.results).toHaveLength(2);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('실패한 이벤트의 사유를 응답에 담아 클라이언트가 큐에서 버릴 수 있게 한다', async () => {
    const result = await useCase.processBatch(USER_ID, [
      dto(DELETED_PLACE_ID, 'enter', '2026-07-30T08:00:00+09:00'),
    ]);

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      placeId: DELETED_PLACE_ID,
      triggeredAt: '2026-07-30T08:00:00+09:00',
    });
    expect(result.failures[0]?.reason).toBeTruthy();
  });

  it('남의 장소를 참조하는 이벤트도 배치를 막지 않고 실패로만 기록한다', async () => {
    const result = await useCase.processBatch(USER_ID, [
      dto(OTHER_USER_PLACE_ID, 'exit', '2026-07-30T07:30:00+09:00'),
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T07:40:00+09:00'),
    ]);

    expect(result.failed).toBe(1);
    expect(result.processed).toBe(1);
  });

  it('모든 이벤트가 실패해도 예외를 던지지 않는다 — 큐가 영구히 막히면 안 된다', async () => {
    await expect(
      useCase.processBatch(USER_ID, [
        dto(DELETED_PLACE_ID, 'enter', '2026-07-30T08:00:00+09:00'),
        dto(DELETED_PLACE_ID, 'exit', '2026-07-30T09:00:00+09:00'),
      ]),
    ).resolves.toMatchObject({ processed: 0, failed: 2 });
  });

  it('정상 배치의 기존 응답 계약(processed/ignored/results)은 유지한다', async () => {
    const result = await useCase.processBatch(USER_ID, [
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T07:30:00+09:00'),
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T03:00:00+09:00'), // 시간대 밖 → ignored
    ]);

    expect(result.processed).toBe(1);
    expect(result.ignored).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
  });
});
