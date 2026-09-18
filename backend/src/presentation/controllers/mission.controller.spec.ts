import { Test, TestingModule } from '@nestjs/testing';
import { MissionController } from './mission.controller';
import { ManageMissionUseCase } from '@application/use-cases/manage-mission.use-case';
import { DailyCheckUseCase } from '@application/use-cases/daily-check.use-case';
import { MissionStatsUseCase } from '@application/use-cases/mission-stats.use-case';

/**
 * 이 컨트롤러가 내려주는 **응답의 모양**을 고정한다.
 *
 * 414줄 중 대부분이 도메인 객체 → 응답 객체 매핑이고, 그 매핑이 곧 웹 클라이언트와의
 * 계약이다. 계약을 글로만 두면 클라이언트 타입이 서버보다 넓어져도(있지도 않은 필드를
 * 읽어도) 양쪽 테스트가 각자 통과한다 — 이 리포가 실제로 발견한 드리프트가 그것이다.
 *
 * 그래서 "필드가 들어 있다"가 아니라 **키 집합이 정확히 이것뿐이다**로 검사한다.
 * `toEqual`은 undefined 값을 가진 키를 무시하므로 키 비교는 `Object.keys`로 한다.
 */
describe('MissionController (응답 계약)', () => {
  let controller: MissionController;
  let manageMission: jest.Mocked<ManageMissionUseCase>;
  let dailyCheck: jest.Mocked<DailyCheckUseCase>;
  let missionStats: jest.Mocked<MissionStatsUseCase>;

  const USER_ID = 'user-123';
  const req = { user: { userId: USER_ID, email: 'u@test.com' } } as never;

  /** 도메인 미션은 컨트롤러가 내려주지 않는 필드까지 들고 있다 — 그게 이 테스트의 핵심이다. */
  const domainMission = {
    id: 'm-1',
    userId: USER_ID,
    title: '영어 단어 외우기',
    emoji: '📖',
    missionType: 'commute',
    isActive: true,
    sortOrder: 0,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-02T00:00:00Z'),
  } as never;

  const MISSION_KEYS = ['id', 'title', 'emoji', 'missionType', 'isActive', 'sortOrder'];

  beforeEach(async () => {
    manageMission = {
      getUserMissions: jest.fn(),
      createMission: jest.fn(),
      updateMission: jest.fn(),
      deleteMission: jest.fn(),
      toggleActive: jest.fn(),
      reorder: jest.fn(),
    } as unknown as jest.Mocked<ManageMissionUseCase>;

    dailyCheck = {
      getDailyStatus: jest.fn(),
      toggleCheck: jest.fn(),
      getDailyScore: jest.fn(),
    } as unknown as jest.Mocked<DailyCheckUseCase>;

    missionStats = {
      getWeeklyStats: jest.fn(),
      getMonthlyStats: jest.fn(),
      getStreak: jest.fn(),
    } as unknown as jest.Mocked<MissionStatsUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionController],
      providers: [
        { provide: ManageMissionUseCase, useValue: manageMission },
        { provide: DailyCheckUseCase, useValue: dailyCheck },
        { provide: MissionStatsUseCase, useValue: missionStats },
      ],
    }).compile();

    controller = module.get<MissionController>(MissionController);
  });

  it('대조군: 도메인 객체에는 컨트롤러가 내려주지 않는 필드가 실제로 들어 있다', () => {
    // 이게 깨지면 아래 "새지 않는다" 검사들이 공허하게 통과하고 있다는 뜻이다.
    const keys = Object.keys(domainMission as object);
    expect(keys).toEqual(expect.arrayContaining(['userId', 'createdAt', 'updatedAt']));
  });

  it('GET /missions 는 6개 키만 내려준다 (userId·createdAt·updatedAt 누출 없음)', async () => {
    manageMission.getUserMissions.mockResolvedValue([domainMission]);

    const res = await controller.getMissions(req);

    expect(Object.keys(res)).toEqual(['missions']);
    expect(Object.keys(res.missions[0]).sort()).toEqual([...MISSION_KEYS].sort());
  });

  it('POST /missions 는 6개 키만 내려준다', async () => {
    manageMission.createMission.mockResolvedValue(domainMission);

    const res = await controller.createMission(req, {
      title: '뉴스 읽기',
      missionType: 'commute',
    } as never);

    expect(Object.keys(res).sort()).toEqual([...MISSION_KEYS].sort());
  });

  it('PATCH /missions/:id 는 6개 키만 내려준다', async () => {
    manageMission.updateMission.mockResolvedValue(domainMission);

    const res = await controller.updateMission(req, 'm-1', { title: '변경' } as never);

    expect(Object.keys(res).sort()).toEqual([...MISSION_KEYS].sort());
  });

  it('PATCH /missions/:id/toggle 은 {id,isActive} 만 내려준다 — 미션 전체가 아니다', async () => {
    manageMission.toggleActive.mockResolvedValue(domainMission);

    const res = await controller.toggleActive(req, 'm-1');

    expect(Object.keys(res).sort()).toEqual(['id', 'isActive'].sort());
  });

  it('PATCH /missions/:id/reorder 는 {id,sortOrder} 만 내려준다 — 미션 전체가 아니다', async () => {
    manageMission.reorder.mockResolvedValue(domainMission);

    const res = await controller.reorder(req, 'm-1', { sortOrder: 2 } as never);

    expect(Object.keys(res).sort()).toEqual(['id', 'sortOrder'].sort());
  });

  it('GET /missions/daily 는 항목을 {mission,isCompleted,completedAt} 로 평탄화한다 (record 키 없음)', async () => {
    dailyCheck.getDailyStatus.mockResolvedValue({
      commuteMissions: [
        {
          mission: domainMission,
          record: { isCompleted: true, completedAt: new Date('2026-09-19T00:00:00Z') },
        },
      ],
      returnMissions: [],
      totalMissions: 1,
      completedMissions: 1,
      completionRate: 100,
      streakDay: 3,
    } as never);

    const res = await controller.getDailyStatus(req);

    const item = res.commuteMissions[0];
    expect(Object.keys(item).sort()).toEqual(['mission', 'isCompleted', 'completedAt'].sort());
    // 중첩된 mission 은 4개 키뿐이다 (isActive·sortOrder 도 없다)
    expect(Object.keys(item.mission).sort()).toEqual(
      ['id', 'title', 'emoji', 'missionType'].sort(),
    );
    expect(item.completedAt).toBe('2026-09-19T00:00:00.000Z');
  });

  it('GET /missions/daily 는 기록이 없으면 isCompleted=false, completedAt=null', async () => {
    dailyCheck.getDailyStatus.mockResolvedValue({
      commuteMissions: [{ mission: domainMission, record: null }],
      returnMissions: [],
      totalMissions: 1,
      completedMissions: 0,
      completionRate: 0,
      streakDay: 0,
    } as never);

    const res = await controller.getDailyStatus(req);

    expect(res.commuteMissions[0].isCompleted).toBe(false);
    expect(res.commuteMissions[0].completedAt).toBeNull();
  });

  it('POST /missions/daily/:id/check 는 {missionId,isCompleted,completedAt} 만 내려준다', async () => {
    dailyCheck.toggleCheck.mockResolvedValue({
      id: 'rec-1',
      userId: USER_ID,
      missionId: 'm-1',
      date: '2026-09-19',
      isCompleted: true,
      completedAt: new Date('2026-09-19T01:00:00Z'),
    } as never);

    const res = await controller.toggleCheck(req, 'm-1');

    expect(Object.keys(res).sort()).toEqual(
      ['missionId', 'isCompleted', 'completedAt'].sort(),
    );
    expect(res.completedAt).toBe('2026-09-19T01:00:00.000Z');
  });

  it('GET /missions/daily/score 는 id·userId 를 내려주지 않고, 없으면 null 이다', async () => {
    dailyCheck.getDailyScore.mockResolvedValue({
      id: 'score-1',
      userId: USER_ID,
      date: '2026-09-19',
      totalMissions: 2,
      completedMissions: 1,
      completionRate: 50,
      streakDay: 4,
    } as never);

    const res = await controller.getDailyScore(req);

    expect(Object.keys(res as object).sort()).toEqual(
      ['date', 'totalMissions', 'completedMissions', 'completionRate', 'streakDay'].sort(),
    );

    dailyCheck.getDailyScore.mockResolvedValue(null as never);
    await expect(controller.getDailyScore(req)).resolves.toBeNull();
  });

  it('요청한 사용자 자신의 id 로만 use-case 를 호출한다 (경로 파라미터를 신뢰하지 않는다)', async () => {
    manageMission.getUserMissions.mockResolvedValue([]);
    await controller.getMissions(req);
    expect(manageMission.getUserMissions).toHaveBeenCalledWith(USER_ID);

    dailyCheck.toggleCheck.mockResolvedValue({
      missionId: 'm-1',
      isCompleted: true,
      completedAt: null,
    } as never);
    await controller.toggleCheck(req, 'm-1');
    expect(dailyCheck.toggleCheck).toHaveBeenCalledWith(USER_ID, 'm-1', expect.any(String));
  });
});
