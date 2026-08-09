import { ProcessCommuteEventUseCase } from './process-commute-event.use-case';
import { UserPlace } from '@domain/entities/user-place.entity';
import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import type { RecordCommuteEventDto } from '@application/dto/commute-event.dto';

/**
 * 출퇴근 자동 감지의 시간대 규칙은 KST 기준이다.
 *
 * 프로덕션(ECS Fargate)은 컨테이너 TZ가 지정돼 있지 않아 Node 런타임이 UTC로 동작한다.
 * 이 스펙은 그 조건을 재현하기 위해 **KST 시각을 담은 ISO 문자열**을 입력으로 준다.
 * `getHours()`(서버 로컬)로 판정하면 KST 07:30 출근이 22시로 읽혀 'ignored'가 되므로,
 * 아래 단언들은 KST 판정이 깨지는 순간 red가 된다.
 */
describe('ProcessCommuteEventUseCase - KST 시간대 규칙', () => {
  const USER_ID = 'user-1';
  const HOME_PLACE_ID = '11111111-1111-4111-8111-111111111111';
  const WORK_PLACE_ID = '22222222-2222-4222-8222-222222222222';

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

  const makePlace = (id: string, placeType: 'home' | 'work'): UserPlace =>
    new UserPlace(USER_ID, placeType, placeType === 'home' ? '집' : '회사', 37.5, 127.0, { id });

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
      findPreferredByUserId: jest.fn(async () =>
        new CommuteRoute(USER_ID, '출근 경로', RouteType.MORNING, { id: 'route-1' }),
      ),
      findByUserIdAndType: jest.fn(async () => []),
      findByUserId: jest.fn(async () => []),
    };
    placeRepository = { findById: jest.fn(), findByIds: jest.fn(async () => []) };

    useCase = new ProcessCommuteEventUseCase(
      eventRepository as never,
      sessionRepository as never,
      routeRepository as never,
      placeRepository as never,
    );
  });

  it('KST 07:30 집 출발을 출근 시작으로 판정한다', async () => {
    placeRepository.findById.mockResolvedValue(makePlace(HOME_PLACE_ID, 'home'));

    const result = await useCase.processEvent(
      USER_ID,
      // UTC로는 전날 22:30 — getHours()면 22시로 읽혀 규칙(5~11시)에서 탈락한다.
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T07:30:00+09:00'),
    );

    expect(result.action).toBe('commute_started');
    expect(result.sessionId).toBeDefined();
  });

  it('KST 09:00 회사 도착을 출근 완료로 판정한다', async () => {
    placeRepository.findById.mockResolvedValue(makePlace(WORK_PLACE_ID, 'work'));
    sessionRepository.findInProgressByUserId.mockResolvedValue(
      new CommuteSession(USER_ID, 'route-1', {
        id: 'session-1',
        startedAt: new Date('2026-07-30T07:30:00+09:00'),
        status: SessionStatus.IN_PROGRESS,
      }),
    );

    const result = await useCase.processEvent(
      USER_ID,
      dto(WORK_PLACE_ID, 'enter', '2026-07-30T09:00:00+09:00'),
    );

    expect(result.action).toBe('commute_completed');
  });

  it('KST 18:30 회사 출발을 퇴근 시작으로 판정한다', async () => {
    placeRepository.findById.mockResolvedValue(makePlace(WORK_PLACE_ID, 'work'));
    routeRepository.findPreferredByUserId.mockResolvedValue(
      new CommuteRoute(USER_ID, '퇴근 경로', RouteType.EVENING, { id: 'route-2' }),
    );

    const result = await useCase.processEvent(
      USER_ID,
      dto(WORK_PLACE_ID, 'exit', '2026-07-30T18:30:00+09:00'),
    );

    expect(result.action).toBe('return_started');
  });

  it('KST 20:00 집 도착을 퇴근 완료로 판정한다', async () => {
    placeRepository.findById.mockResolvedValue(makePlace(HOME_PLACE_ID, 'home'));
    sessionRepository.findInProgressByUserId.mockResolvedValue(
      new CommuteSession(USER_ID, 'route-2', {
        id: 'session-2',
        startedAt: new Date('2026-07-30T18:30:00+09:00'),
        status: SessionStatus.IN_PROGRESS,
      }),
    );

    const result = await useCase.processEvent(
      USER_ID,
      dto(HOME_PLACE_ID, 'enter', '2026-07-30T20:00:00+09:00'),
    );

    expect(result.action).toBe('return_completed');
  });

  it('KST 03:00 집 출발은 시간대 밖이라 무시한다', async () => {
    placeRepository.findById.mockResolvedValue(makePlace(HOME_PLACE_ID, 'home'));

    const result = await useCase.processEvent(
      USER_ID,
      // UTC로는 전날 18:00 — getHours()면 18시로 읽혀 엉뚱하게 분류될 수 있다.
      dto(HOME_PLACE_ID, 'exit', '2026-07-30T03:00:00+09:00'),
    );

    expect(result.action).toBe('ignored');
    expect(result.sessionId).toBeUndefined();
  });
});
