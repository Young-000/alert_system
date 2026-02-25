import { MissionStatsUseCase } from './mission-stats.use-case';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { MissionScore } from '@domain/entities/mission-score.entity';

describe('MissionStatsUseCase', () => {
  let useCase: MissionStatsUseCase;
  let repo: jest.Mocked<IMissionRepository>;

  const USER_ID = 'user-1';
  const TODAY = '2026-02-25';

  beforeEach(() => {
    repo = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      countByUserAndType: jest.fn(),
      saveMission: jest.fn(),
      deleteMission: jest.fn(),
      findDailyRecords: jest.fn(),
      findDailyRecord: jest.fn(),
      saveDailyRecord: jest.fn(),
      findScore: jest.fn(),
      findScoreRange: jest.fn(),
      saveScore: jest.fn(),
      findLatestStreak: jest.fn(),
    };
    useCase = new MissionStatsUseCase(repo);
  });

  describe('getWeeklyStats', () => {
    it('최근 7일 scores로 주간 달성률을 계산한다', async () => {
      const scores = [
        new MissionScore({
          userId: USER_ID,
          date: '2026-02-19',
          totalMissions: 3,
          completedMissions: 3,
          completionRate: 100,
          streakDay: 1,
        }),
        new MissionScore({
          userId: USER_ID,
          date: '2026-02-20',
          totalMissions: 3,
          completedMissions: 2,
          completionRate: 67,
          streakDay: 0,
        }),
        new MissionScore({
          userId: USER_ID,
          date: '2026-02-21',
          totalMissions: 3,
          completedMissions: 3,
          completionRate: 100,
          streakDay: 1,
        }),
      ];

      repo.findScoreRange.mockResolvedValue(scores);

      const result = await useCase.getWeeklyStats(USER_ID, TODAY);

      // 3일의 totalMissions 합 = 3+3+3 = 9
      expect(result.totalMissions).toBe(9);
      // 3일의 completedMissions 합 = 3+2+3 = 8
      expect(result.totalCompleted).toBe(8);
      // completionRate = round(8/9*100) = 89
      expect(result.completionRate).toBe(89);
      // dailyScores 길이 = 3
      expect(result.dailyScores).toHaveLength(3);
      expect(result.dailyScores[0].date).toBe('2026-02-19');

      // 날짜 범위 확인: 7일 전(2026-02-19) ~ 오늘(2026-02-25)
      expect(repo.findScoreRange).toHaveBeenCalledWith(
        USER_ID,
        '2026-02-19',
        TODAY,
      );
    });

    it('데이터가 없으면 0을 반환한다', async () => {
      repo.findScoreRange.mockResolvedValue([]);

      const result = await useCase.getWeeklyStats(USER_ID, TODAY);

      expect(result.totalMissions).toBe(0);
      expect(result.totalCompleted).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.dailyScores).toHaveLength(0);
    });

    it('모든 미션 완료 시 100%를 반환한다', async () => {
      const scores = Array.from({ length: 7 }, (_, i) =>
        new MissionScore({
          userId: USER_ID,
          date: `2026-02-${19 + i}`,
          totalMissions: 2,
          completedMissions: 2,
          completionRate: 100,
          streakDay: i + 1,
        }),
      );

      repo.findScoreRange.mockResolvedValue(scores);

      const result = await useCase.getWeeklyStats(USER_ID, TODAY);

      expect(result.totalMissions).toBe(14);
      expect(result.totalCompleted).toBe(14);
      expect(result.completionRate).toBe(100);
    });
  });

  describe('getMonthlyStats', () => {
    it('최근 30일 scores로 월간 달성률을 계산한다', async () => {
      const scores = [
        new MissionScore({
          userId: USER_ID,
          date: '2026-02-01',
          totalMissions: 2,
          completedMissions: 1,
          completionRate: 50,
          streakDay: 0,
        }),
        new MissionScore({
          userId: USER_ID,
          date: '2026-02-15',
          totalMissions: 2,
          completedMissions: 2,
          completionRate: 100,
          streakDay: 1,
        }),
      ];

      repo.findScoreRange.mockResolvedValue(scores);

      const result = await useCase.getMonthlyStats(USER_ID, TODAY);

      expect(result.totalMissions).toBe(4);
      expect(result.totalCompleted).toBe(3);
      expect(result.completionRate).toBe(75);
      expect(result.dailyScores).toHaveLength(2);

      // 날짜 범위: 30일 전(2026-01-27) ~ 오늘(2026-02-25)
      expect(repo.findScoreRange).toHaveBeenCalledWith(
        USER_ID,
        '2026-01-27',
        TODAY,
      );
    });

    it('데이터가 없으면 0을 반환한다', async () => {
      repo.findScoreRange.mockResolvedValue([]);

      const result = await useCase.getMonthlyStats(USER_ID, TODAY);

      expect(result.totalMissions).toBe(0);
      expect(result.totalCompleted).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.dailyScores).toHaveLength(0);
    });
  });

  describe('getStreak', () => {
    it('repository에서 최신 streak을 가져온다', async () => {
      repo.findLatestStreak.mockResolvedValue(7);

      const result = await useCase.getStreak(USER_ID);

      expect(result).toBe(7);
      expect(repo.findLatestStreak).toHaveBeenCalledWith(USER_ID);
    });

    it('streak이 없으면 0을 반환한다', async () => {
      repo.findLatestStreak.mockResolvedValue(0);

      const result = await useCase.getStreak(USER_ID);

      expect(result).toBe(0);
    });
  });

  describe('daysAgo (private, tested via getWeeklyStats/getMonthlyStats)', () => {
    it('월 경계를 넘는 날짜를 올바르게 계산한다', async () => {
      // 2026-03-03에서 6일 전 = 2026-02-25 (2026년 2월은 28일)
      repo.findScoreRange.mockResolvedValue([]);

      await useCase.getWeeklyStats(USER_ID, '2026-03-03');

      expect(repo.findScoreRange).toHaveBeenCalledWith(
        USER_ID,
        '2026-02-25',
        '2026-03-03',
      );
    });

    it('연도 경계를 넘는 날짜를 올바르게 계산한다', async () => {
      // 2026-01-05에서 7일 전 = 2025-12-30
      repo.findScoreRange.mockResolvedValue([]);

      await useCase.getWeeklyStats(USER_ID, '2026-01-05');

      expect(repo.findScoreRange).toHaveBeenCalledWith(
        USER_ID,
        '2025-12-30',
        '2026-01-05',
      );
    });

    it('윤년 2월 경계를 올바르게 처리한다', async () => {
      // 2028-03-01에서 29일 전 = 2028-02-01 (2028은 윤년이므로 2월은 29일)
      repo.findScoreRange.mockResolvedValue([]);

      await useCase.getMonthlyStats(USER_ID, '2028-03-01');

      expect(repo.findScoreRange).toHaveBeenCalledWith(
        USER_ID,
        '2028-02-01',
        '2028-03-01',
      );
    });
  });
});
