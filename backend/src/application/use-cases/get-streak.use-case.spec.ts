import { Test, TestingModule } from '@nestjs/testing';
import { GetStreakUseCase } from './get-streak.use-case';
import { COMMUTE_STREAK_REPOSITORY } from '@domain/repositories/commute-streak.repository';
import { CommuteStreak } from '@domain/entities/commute-streak.entity';
import { getTodayKST, subtractDays } from '@domain/utils/kst-date';

describe('GetStreakUseCase', () => {
  let useCase: GetStreakUseCase;
  let repository: {
    findByUserId: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    saveDailyLog: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      saveDailyLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStreakUseCase,
        { provide: COMMUTE_STREAK_REPOSITORY, useValue: repository },
      ],
    }).compile();

    useCase = module.get<GetStreakUseCase>(GetStreakUseCase);
  });

  describe('execute', () => {
    it('기록이 없는 사용자는 새 스트릭 기본값을 반환한다', async () => {
      repository.findByUserId.mockResolvedValue(null);

      const result = await useCase.execute(userId);

      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(0);
      expect(result.streakStatus).toBe('new');
      expect(result.todayRecorded).toBe(false);
    });

    it('오늘 기록한 사용자는 active + todayRecorded를 반환한다', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 5,
          bestStreak: 9,
          lastRecordDate: today,
          streakStartDate: subtractDays(today, 4),
        }),
      );

      const result = await useCase.execute(userId);

      expect(result.streakStatus).toBe('active');
      expect(result.todayRecorded).toBe(true);
      expect(result.currentStreak).toBe(5);
    });

    it('어제까지 기록한 사용자의 스트릭은 유지된다 (at_risk)', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 5,
          lastRecordDate: subtractDays(today, 1),
        }),
      );

      const result = await useCase.execute(userId);

      expect(result.streakStatus).toBe('at_risk');
      expect(result.currentStreak).toBe(5);
    });

    it('2일 이상 빠진 사용자의 연속 일수는 0으로 보고된다', async () => {
      // 저장된 currentStreak은 마지막 기록 시점의 값이라 이미 낡았다.
      // 그대로 내보내면 홈 화면이 "다시 시작해보세요"와 "연속 12일"을 함께 띄운다.
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 12,
          bestStreak: 25,
          streakStartDate: subtractDays(today, 15),
          lastRecordDate: subtractDays(today, 3),
          milestonesAchieved: ['7d'],
        }),
      );

      const result = await useCase.execute(userId);

      expect(result.streakStatus).toBe('broken');
      expect(result.currentStreak).toBe(0);
      expect(result.streakStartDate).toBeNull();
      expect(result.bestStreak).toBe(25);
      expect(result.milestonesAchieved).toEqual(['7d']);
    });

    it('끊긴 스트릭의 다음 마일스톤 진행률은 0이다', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 12,
          lastRecordDate: subtractDays(today, 3),
          milestonesAchieved: ['7d'],
        }),
      );

      const result = await useCase.execute(userId);

      expect(result.nextMilestone).toEqual({
        type: '14d',
        label: '14일 연속',
        daysRemaining: 14,
        progress: 0,
      });
    });

    it('낡은 스트릭을 바로잡아도 DB에 쓰지 않는다 (조회 경로)', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 12,
          lastRecordDate: subtractDays(today, 3),
        }),
      );

      await useCase.execute(userId);

      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('지난 주 카운트는 0으로 리셋해 반환한다', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          weeklyCount: 5,
          weekStartDate: subtractDays(today, 30),
          lastRecordDate: today,
        }),
      );

      const result = await useCase.execute(userId);

      expect(result.weeklyCount).toBe(0);
    });

    it('저장소가 없으면 에러를 던진다', async () => {
      const bare = new GetStreakUseCase();
      await expect(bare.execute(userId)).rejects.toThrow('Streak repository not available');
    });
  });

  describe('getMilestones', () => {
    it('달성 배지와 미달성 진행률을 함께 반환한다', async () => {
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 10,
          lastRecordDate: today,
          milestonesAchieved: ['7d'],
        }),
      );

      const result = await useCase.getMilestones(userId);

      expect(result.currentStreak).toBe(10);
      expect(result.earnedBadges.map((b) => b.type)).toEqual(['7d']);

      const achieved = result.milestones.find((m) => m.type === '7d');
      expect(achieved?.achieved).toBe(true);

      const next = result.milestones.find((m) => m.type === '14d');
      expect(next?.achieved).toBe(false);
      expect(next?.daysRemaining).toBe(4);
    });

    it('끊긴 스트릭은 마일스톤 진행률도 처음부터 센다', async () => {
      // 화면의 배지 패널이 홈 배지와 다른 숫자를 보여주면 안 된다.
      const today = getTodayKST();
      repository.findByUserId.mockResolvedValue(
        new CommuteStreak(userId, {
          currentStreak: 10,
          lastRecordDate: subtractDays(today, 3),
          milestonesAchieved: ['7d'],
        }),
      );

      const result = await useCase.getMilestones(userId);

      expect(result.currentStreak).toBe(0);
      expect(result.earnedBadges.map((b) => b.type)).toEqual(['7d']);

      const next = result.milestones.find((m) => m.type === '14d');
      expect(next?.daysRemaining).toBe(14);
      expect(next?.progress).toBe(0);
    });

    it('기록이 없는 사용자는 배지 없이 전체 마일스톤을 반환한다', async () => {
      repository.findByUserId.mockResolvedValue(null);

      const result = await useCase.getMilestones(userId);

      expect(result.earnedBadges).toEqual([]);
      expect(result.milestones).toHaveLength(5);
      expect(result.milestones.every((m) => !m.achieved)).toBe(true);
    });

    it('저장소가 없으면 에러를 던진다', async () => {
      const bare = new GetStreakUseCase();
      await expect(bare.getMilestones(userId)).rejects.toThrow('Streak repository not available');
    });
  });
});
