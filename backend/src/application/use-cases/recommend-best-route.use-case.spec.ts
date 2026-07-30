import { RecommendBestRouteUseCase } from './recommend-best-route.use-case';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';

type SessionStub = Pick<
  CommuteSession,
  'routeId' | 'status' | 'totalDurationMinutes' | 'weatherCondition'
>;

function session(
  routeId: string,
  totalDurationMinutes: number,
  weatherCondition?: string,
): CommuteSession {
  const stub: SessionStub = {
    routeId,
    status: SessionStatus.COMPLETED,
    totalDurationMinutes,
    weatherCondition,
  };
  return stub as CommuteSession;
}

/** 같은 평균을 유지하면서 변동성만 만들어 주는 세션 묶음 */
function sessionsWithAverage(
  routeId: string,
  average: number,
  count: number,
): CommuteSession[] {
  return Array.from({ length: count }, () => session(routeId, average));
}

describe('RecommendBestRouteUseCase', () => {
  let useCase: RecommendBestRouteUseCase;
  let sessionRepository: { findByUserIdInDateRange: jest.Mock };
  let routeRepository: { findByIds: jest.Mock };

  beforeEach(() => {
    sessionRepository = { findByUserIdInDateRange: jest.fn() };
    routeRepository = { findByIds: jest.fn() };
    useCase = new RecommendBestRouteUseCase(
      sessionRepository as never,
      routeRepository as never,
    );
  });

  function givenRoutes(routes: { id: string; name: string }[]): void {
    routeRepository.findByIds.mockResolvedValue(routes);
  }

  function givenSessions(sessions: CommuteSession[]): void {
    sessionRepository.findByUserIdInDateRange.mockResolvedValue(sessions);
  }

  describe('추천 이유', () => {
    it('가장 빠른 경로가 아니면 "가장 짧아요"라고 말하지 않는다', async () => {
      // 3개 경로: 30분(최속) / 34분 / 50분.
      // 34분 경로는 speedScore가 90점이라 임계값(80)만으로는 최속으로 오인된다.
      givenRoutes([
        { id: 'fast', name: '지하철' },
        { id: 'mid', name: '버스' },
        { id: 'slow', name: '도보' },
      ]);
      givenSessions([
        ...sessionsWithAverage('fast', 30, 3),
        ...sessionsWithAverage('mid', 34, 3),
        ...sessionsWithAverage('slow', 50, 3),
      ]);

      const result = await useCase.execute('user-1');

      const mid = [result.recommendation, ...result.alternatives].find(
        (r) => r?.routeId === 'mid',
      );
      expect(mid).toBeDefined();
      expect(mid!.reasons.join(' ')).not.toContain('가장 짧아요');
    });

    it('실제로 가장 빠른 경로에는 "가장 짧아요"를 붙인다', async () => {
      givenRoutes([
        { id: 'fast', name: '지하철' },
        { id: 'slow', name: '도보' },
      ]);
      givenSessions([
        ...sessionsWithAverage('fast', 30, 3),
        ...sessionsWithAverage('slow', 50, 3),
      ]);

      const result = await useCase.execute('user-1');

      const fast = [result.recommendation, ...result.alternatives].find(
        (r) => r?.routeId === 'fast',
      );
      expect(fast!.reasons.join(' ')).toContain('가장 짧아요');
    });

    it('경로가 하나뿐이면 비교 대상이 없으므로 "가장 짧아요"를 쓰지 않는다', async () => {
      givenRoutes([{ id: 'only', name: '지하철' }]);
      givenSessions(sessionsWithAverage('only', 30, 3));

      const result = await useCase.execute('user-1');

      expect(result.recommendation!.reasons.join(' ')).not.toContain('가장 짧아요');
      expect(result.recommendation!.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('기본 동작', () => {
    it('완료된 세션이 없으면 안내 메시지를 반환한다', async () => {
      givenSessions([]);

      const result = await useCase.execute('user-1');

      expect(result.recommendedRouteId).toBeNull();
      expect(result.insights[0]).toContain('아직 통근 데이터가 없어요');
    });

    it('점수가 높은 경로를 추천으로, 나머지를 대안으로 반환한다', async () => {
      givenRoutes([
        { id: 'fast', name: '지하철' },
        { id: 'slow', name: '도보' },
      ]);
      givenSessions([
        ...sessionsWithAverage('fast', 30, 3),
        ...sessionsWithAverage('slow', 50, 3),
      ]);

      const result = await useCase.execute('user-1');

      expect(result.recommendedRouteId).toBe('fast');
      expect(result.alternatives.map((a) => a.routeId)).toEqual(['slow']);
    });
  });
});
