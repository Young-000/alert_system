import { ManageRouteUseCase } from './manage-route.use-case';
import {
  CommuteRoute,
  RouteCheckpoint,
  RouteType,
  CheckpointType,
} from '@domain/entities/commute-route.entity';
import type { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';

/**
 * 대표 경로(isPreferred)는 사용자·routeType 조합마다 최대 1개여야 한다.
 * `findPreferredByUserId()`는 `findOne`이라 중복이 생기면 어느 쪽이 뽑힐지
 * 비결정적이고, `process-commute-event.use-case.ts:258`이 그 결과로
 * 출퇴근 이벤트를 엉뚱한 경로에 귀속시킨다.
 */
describe('ManageRouteUseCase - 대표 경로 유일성', () => {
  let useCase: ManageRouteUseCase;
  let repo: jest.Mocked<ICommuteRouteRepository>;

  const makeRoute = (
    id: string,
    routeType: RouteType,
    isPreferred: boolean,
  ): CommuteRoute =>
    new CommuteRoute('user-1', `경로 ${id}`, routeType, {
      id,
      isPreferred,
      totalExpectedDuration: 30,
      checkpoints: [],
    });

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findPreferredByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<ICommuteRouteRepository>;

    useCase = new ManageRouteUseCase(repo);
  });

  it('이미 대표인 경로의 routeType을 바꾸면 새 타입의 기존 대표를 해제한다', async () => {
    // A: morning + 대표, B: evening + 대표 (각 타입마다 하나씩 — 정상 상태)
    const routeA = makeRoute('route-a', RouteType.MORNING, true);
    const routeB = makeRoute('route-b', RouteType.EVENING, true);

    repo.findById.mockImplementation(async (id: string) =>
      id === 'route-a' ? makeRoute('route-a', RouteType.EVENING, true) : undefined,
    );
    repo.findById.mockResolvedValueOnce(routeA); // updateRoute 진입 시 조회
    repo.findPreferredByUserId.mockResolvedValue(routeB);

    // A를 evening으로 옮기면서 대표 유지 → B의 대표 표시가 해제돼야 한다
    await useCase.updateRoute('route-a', {
      routeType: RouteType.EVENING,
      isPreferred: true,
    });

    expect(repo.findPreferredByUserId).toHaveBeenCalledWith('user-1', RouteType.EVENING);

    const unsetCall = repo.update.mock.calls.find(
      ([route]) => route.id === 'route-b',
    );
    expect(unsetCall).toBeDefined();
    expect(unsetCall![0].isPreferred).toBe(false);
  });

  it('대표가 아니던 경로를 대표로 올리면 기존 대표를 해제한다 (기존 동작 유지)', async () => {
    const routeA = makeRoute('route-a', RouteType.MORNING, false);
    const routeB = makeRoute('route-b', RouteType.MORNING, true);

    repo.findById.mockResolvedValueOnce(routeA);
    repo.findById.mockResolvedValue(makeRoute('route-a', RouteType.MORNING, true));
    repo.findPreferredByUserId.mockResolvedValue(routeB);

    await useCase.updateRoute('route-a', { isPreferred: true });

    const unsetCall = repo.update.mock.calls.find(
      ([route]) => route.id === 'route-b',
    );
    expect(unsetCall![0].isPreferred).toBe(false);
  });

  it('routeType이 그대로면 이미 대표인 경로에 대해 해제 조회를 하지 않는다', async () => {
    const routeA = makeRoute('route-a', RouteType.MORNING, true);

    repo.findById.mockResolvedValueOnce(routeA);
    repo.findById.mockResolvedValue(routeA);

    await useCase.updateRoute('route-a', { name: '이름만 변경', isPreferred: true });

    expect(repo.findPreferredByUserId).not.toHaveBeenCalled();
  });

  it('자기 자신이 새 타입의 대표로 잡혀도 스스로를 해제하지 않는다', async () => {
    const routeA = makeRoute('route-a', RouteType.MORNING, true);

    repo.findById.mockResolvedValueOnce(routeA);
    repo.findById.mockResolvedValue(makeRoute('route-a', RouteType.EVENING, true));
    // 새 타입의 대표 조회 결과가 자기 자신인 경우
    repo.findPreferredByUserId.mockResolvedValue(
      makeRoute('route-a', RouteType.EVENING, true),
    );

    await useCase.updateRoute('route-a', {
      routeType: RouteType.EVENING,
      isPreferred: true,
    });

    const selfUnset = repo.update.mock.calls.find(
      ([route]) => route.id === 'route-a' && route.isPreferred === false,
    );
    expect(selfUnset).toBeUndefined();
  });

  it('대표로 만들지 않는 수정은 기존 대표를 건드리지 않는다', async () => {
    const routeA = makeRoute('route-a', RouteType.MORNING, false);

    repo.findById.mockResolvedValueOnce(routeA);
    repo.findById.mockResolvedValue(routeA);

    await useCase.updateRoute('route-a', { routeType: RouteType.EVENING });

    expect(repo.findPreferredByUserId).not.toHaveBeenCalled();
  });

  /**
   * 기존 대표를 해제할 때 그 경로를 새 CommuteRoute로 재구성한다.
   * 이때 필드를 빠뜨리면 사용자가 건드리지도 않은 경로의 값이 유실된다.
   * 특히 체크포인트 id를 잃으면 저장 시 전부 새 체크포인트로 취급돼
   * `ON DELETE CASCADE`로 그 경로의 도착 기록까지 사라진다
   * (`commute-route.repository.ts` update() 참조).
   */
  it('기존 대표를 해제할 때 그 경로의 다른 필드를 잃지 않는다', async () => {
    const routeA = makeRoute('route-a', RouteType.MORNING, false);
    const routeB = new CommuteRoute('user-1', '경로 route-b', RouteType.MORNING, {
      id: 'route-b',
      isPreferred: true,
      totalExpectedDuration: 47,
      checkpoints: [
        new RouteCheckpoint(0, '집', CheckpointType.HOME, { id: 'cp-b1', routeId: 'route-b' }),
        new RouteCheckpoint(1, '회사', CheckpointType.WORK, { id: 'cp-b2', routeId: 'route-b' }),
      ],
    });

    repo.findById.mockResolvedValueOnce(routeA);
    repo.findById.mockResolvedValue(makeRoute('route-a', RouteType.MORNING, true));
    repo.findPreferredByUserId.mockResolvedValue(routeB);

    await useCase.updateRoute('route-a', { isPreferred: true });

    const unsetCall = repo.update.mock.calls.find(([route]) => route.id === 'route-b');
    expect(unsetCall![0].isPreferred).toBe(false);
    expect(unsetCall![0].totalExpectedDuration).toBe(47);
    expect(unsetCall![0].checkpoints.map((cp) => cp.id)).toEqual(['cp-b1', 'cp-b2']);
  });
});
