import { GetCommuteStatsUseCase } from './get-commute-stats.use-case';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';
import type { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import type { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';

/**
 * `weatherCondition`은 선택 필드이고, 프론트엔드의 세션 시작 경로
 * (`use-home-data.ts:214`, `CommuteTrackingPage.tsx:76,91`) 중 어디도 이 값을 보내지 않는다.
 * 즉 실제 세션은 대부분 날씨가 비어 있다.
 *
 * 이 값을 '맑음'으로 채워 넣으면 `/reports` 월간 탭의 `WeatherImpactSection`
 * (`MonthlyTab.tsx:81`)이 존재하지 않는 맑은 날 표본을 "맑음 N회"로 단언한다.
 */
describe('GetCommuteStatsUseCase - 날씨별 영향', () => {
  let useCase: GetCommuteStatsUseCase;
  let sessionRepo: jest.Mocked<ICommuteSessionRepository>;
  let routeRepo: jest.Mocked<ICommuteRouteRepository>;

  const makeSession = (
    durationMinutes: number,
    weatherCondition?: string,
  ): CommuteSession =>
    new CommuteSession('user-1', 'route-1', {
      id: `session-${durationMinutes}-${weatherCondition ?? 'none'}`,
      status: SessionStatus.COMPLETED,
      totalDurationMinutes: durationMinutes,
      weatherCondition,
    });

  beforeEach(() => {
    sessionRepo = {
      findByUserIdInDateRange: jest.fn(),
    } as unknown as jest.Mocked<ICommuteSessionRepository>;

    routeRepo = {
      findByUserId: jest.fn().mockResolvedValue([
        new CommuteRoute('user-1', '출근길', RouteType.MORNING, {
          id: 'route-1',
          checkpoints: [],
        }),
      ]),
    } as unknown as jest.Mocked<ICommuteRouteRepository>;

    useCase = new GetCommuteStatsUseCase(sessionRepo, routeRepo);
  });

  it('날씨가 기록되지 않은 세션은 날씨별 통계에서 제외한다', async () => {
    sessionRepo.findByUserIdInDateRange.mockResolvedValue([
      makeSession(40),
      makeSession(42),
      makeSession(44),
    ]);

    const stats = await useCase.execute('user-1');

    // 기록된 날씨가 하나도 없으므로 주장할 수 있는 날씨별 판정도 없다
    expect(stats.weatherImpact).toEqual([]);
  });

  it('날씨가 기록된 세션만 표본에 넣는다', async () => {
    sessionRepo.findByUserIdInDateRange.mockResolvedValue([
      makeSession(40, '맑음'),
      makeSession(60),
      makeSession(62),
    ]);

    const stats = await useCase.execute('user-1');

    expect(stats.weatherImpact).toHaveLength(1);
    expect(stats.weatherImpact[0].condition).toBe('맑음');
    expect(stats.weatherImpact[0].sampleCount).toBe(1);
    expect(stats.weatherImpact[0].averageDuration).toBe(40);
  });

  it('미기록 세션이 맑은 날 baseline을 오염시키지 않는다', async () => {
    // 실제 맑은 날은 30분, 비 오는 날은 40분 (+10분)
    // 미기록 세션 60분짜리가 맑음으로 섞이면 baseline이 45분으로 올라가
    // "비 오는 날이 더 빠르다"는 거꾸로 된 판정이 나온다.
    sessionRepo.findByUserIdInDateRange.mockResolvedValue([
      makeSession(30, '맑음'),
      makeSession(40, '비'),
      makeSession(60),
      makeSession(60),
    ]);

    const stats = await useCase.execute('user-1');

    const rain = stats.weatherImpact.find((w) => w.condition === '비');
    expect(rain?.comparedToNormal).toBe(10);
    expect(stats.insights).toContain('비 오는 날 평균 10분 더 걸려요');
  });

  it('전체 통계(totalSessions·평균)는 날씨 기록 여부와 무관하게 모든 세션을 센다', async () => {
    sessionRepo.findByUserIdInDateRange.mockResolvedValue([
      makeSession(30, '맑음'),
      makeSession(50),
    ]);

    const stats = await useCase.execute('user-1');

    expect(stats.totalSessions).toBe(2);
    expect(stats.recentSessions).toBe(2);
    expect(stats.overallAverageDuration).toBe(40);
  });
});
