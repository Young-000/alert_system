import { ForbiddenException } from '@nestjs/common';
import { ManageCommuteSessionUseCase } from './manage-commute-session.use-case';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';

describe('ManageCommuteSessionUseCase', () => {
  let useCase: ManageCommuteSessionUseCase;
  let sessionRepo: jest.Mocked<ICommuteSessionRepository>;
  let routeRepo: jest.Mocked<ICommuteRouteRepository>;

  const userId = 'user-123';

  const makeSession = (id: string): CommuteSession =>
    new CommuteSession(userId, 'route-1', {
      id,
      startedAt: new Date('2026-07-29T00:00:00Z'),
      status: SessionStatus.COMPLETED,
      completedAt: new Date('2026-07-29T00:40:00Z'),
      checkpointRecords: [],
    });

  const makeRoute = (ownerId: string): CommuteRoute =>
    new CommuteRoute(ownerId, '출근길', RouteType.MORNING, {
      id: 'route-1',
      checkpoints: [],
    });

  beforeEach(() => {
    sessionRepo = {
      findByUserId: jest.fn(),
      countByUserId: jest.fn().mockResolvedValue(0),
      findInProgressByUserId: jest.fn().mockResolvedValue(undefined),
      save: jest.fn((s) => Promise.resolve(s)),
    } as unknown as jest.Mocked<ICommuteSessionRepository>;

    routeRepo = {
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICommuteRouteRepository>;

    useCase = new ManageCommuteSessionUseCase(sessionRepo, routeRepo);
  });

  describe('startSession 경로 소유권', () => {
    it('다른 사용자의 경로로는 세션을 시작할 수 없다', async () => {
      routeRepo.findById.mockResolvedValue(makeRoute('other-user'));

      await expect(useCase.startSession({ userId, routeId: 'route-1' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('자신의 경로로는 세션을 시작할 수 있다', async () => {
      routeRepo.findById.mockResolvedValue(makeRoute(userId));

      await useCase.startSession({ userId, routeId: 'route-1' });

      expect(sessionRepo.save).toHaveBeenCalled();
    });
  });

  describe('getHistory pagination', () => {
    it('오프셋을 리포지토리까지 전달한다 (2페이지 요청이 1페이지를 반환하면 안 됨)', async () => {
      sessionRepo.findByUserId.mockResolvedValue([]);

      await useCase.getHistory(userId, 10, 10);

      expect(sessionRepo.findByUserId).toHaveBeenCalledWith(userId, 11, 10);
    });

    it('오프셋이 없으면 첫 페이지를 조회한다', async () => {
      sessionRepo.findByUserId.mockResolvedValue([]);

      await useCase.getHistory(userId, 10);

      expect(sessionRepo.findByUserId).toHaveBeenCalledWith(userId, 11, 0);
    });

    it('limit+1건이 조회되면 hasMore=true이고 초과분은 잘라낸다', async () => {
      sessionRepo.findByUserId.mockResolvedValue([
        makeSession('s-1'),
        makeSession('s-2'),
        makeSession('s-3'),
      ]);

      const result = await useCase.getHistory(userId, 2, 0);

      expect(result.hasMore).toBe(true);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.map((s) => s.id)).toEqual(['s-1', 's-2']);
    });

    it('totalCount는 페이지 크기가 아니라 전체 기록 수를 반환한다', async () => {
      sessionRepo.findByUserId.mockResolvedValue([makeSession('s-1'), makeSession('s-2')]);
      (sessionRepo.countByUserId as jest.Mock).mockResolvedValue(57);

      const result = await useCase.getHistory(userId, 1, 0);

      expect(result.totalCount).toBe(57);
    });
  });
});
