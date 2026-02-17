import { CommuteStreak } from './commute-streak.entity';

describe('CommuteStreak', () => {
  const userId = 'user-123';

  describe('recordCompletion', () => {
    it('첫 기록 시 스트릭이 1이 된다', () => {
      const streak = CommuteStreak.createNew(userId);
      const result = streak.recordCompletion('2026-02-17');

      expect(result.updated).toBe(true);
      expect(streak.currentStreak).toBe(1);
      expect(streak.lastRecordDate).toBe('2026-02-17');
      expect(streak.streakStartDate).toBe('2026-02-17');
    });

    it('어제 기록이 있으면 스트릭이 연장된다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 5,
        lastRecordDate: '2026-02-16',
        streakStartDate: '2026-02-12',
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.updated).toBe(true);
      expect(streak.currentStreak).toBe(6);
      expect(streak.lastRecordDate).toBe('2026-02-17');
      expect(streak.streakStartDate).toBe('2026-02-12'); // 시작일 유지
    });

    it('하루 건너뛰면 스트릭이 리셋된다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 10,
        lastRecordDate: '2026-02-14',
        streakStartDate: '2026-02-05',
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.updated).toBe(true);
      expect(streak.currentStreak).toBe(1);
      expect(streak.streakStartDate).toBe('2026-02-17');
    });

    it('같은 날 중복 기록은 무시된다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 3,
        lastRecordDate: '2026-02-17',
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.updated).toBe(false);
      expect(result.milestoneAchieved).toBeNull();
      expect(streak.currentStreak).toBe(3);
    });

    it('최고 기록이 갱신된다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 9,
        bestStreak: 8,
        lastRecordDate: '2026-02-16',
        streakStartDate: '2026-02-08',
      });

      streak.recordCompletion('2026-02-17');

      expect(streak.bestStreak).toBe(10);
      expect(streak.bestStreakEnd).toBe('2026-02-17');
    });

    it('현재 스트릭이 최고 기록보다 낮으면 최고 기록이 유지된다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 1,
        bestStreak: 25,
        lastRecordDate: '2026-02-16',
        streakStartDate: '2026-02-16',
        bestStreakEnd: '2026-01-30',
      });

      streak.recordCompletion('2026-02-17');

      expect(streak.currentStreak).toBe(2);
      expect(streak.bestStreak).toBe(25);
      expect(streak.bestStreakEnd).toBe('2026-01-30');
    });
  });

  describe('checkMilestone', () => {
    it('7일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 6,
        lastRecordDate: '2026-02-16',
        streakStartDate: '2026-02-11',
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('7d');
      expect(streak.milestonesAchieved).toContain('7d');
      expect(streak.latestMilestone).toBe('7d');
    });

    it('이미 달성한 마일스톤은 중복 달성되지 않는다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 6,
        lastRecordDate: '2026-02-16',
        streakStartDate: '2026-02-11',
        milestonesAchieved: ['7d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBeNull();
    });

    it('30일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 29,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('30d');
      expect(streak.milestonesAchieved).toEqual(['7d', '30d']);
    });

    it('100일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 99,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d', '30d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('100d');
    });
  });

  describe('getStatus', () => {
    it('기록이 없으면 new 상태다', () => {
      const streak = CommuteStreak.createNew(userId);
      expect(streak.getStatus('2026-02-17')).toBe('new');
    });

    it('오늘 기록이 있으면 active 상태다', () => {
      const streak = new CommuteStreak(userId, {
        lastRecordDate: '2026-02-17',
        currentStreak: 5,
      });
      expect(streak.getStatus('2026-02-17')).toBe('active');
    });

    it('어제 기록이 있으면 active 상태다', () => {
      const streak = new CommuteStreak(userId, {
        lastRecordDate: '2026-02-16',
        currentStreak: 5,
      });
      expect(streak.getStatus('2026-02-17')).toBe('active');
    });

    it('2일 이상 기록이 없으면 broken 상태다', () => {
      const streak = new CommuteStreak(userId, {
        lastRecordDate: '2026-02-14',
        currentStreak: 5,
      });
      expect(streak.getStatus('2026-02-17')).toBe('broken');
    });
  });

  describe('getNextMilestone', () => {
    it('달성하지 않은 첫 마일스톤을 반환한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 3,
      });

      const next = streak.getNextMilestone();

      expect(next).toEqual({
        type: '7d',
        label: '7일 연속',
        daysRemaining: 4,
        progress: 3 / 7,
      });
    });

    it('7일을 달성하면 30일이 다음 목표다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        milestonesAchieved: ['7d'],
      });

      const next = streak.getNextMilestone();

      expect(next?.type).toBe('30d');
      expect(next?.daysRemaining).toBe(18);
    });

    it('모든 마일스톤을 달성하면 null을 반환한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 150,
        milestonesAchieved: ['7d', '30d', '100d'],
      });

      expect(streak.getNextMilestone()).toBeNull();
    });
  });

  describe('ensureWeeklyCountCurrent', () => {
    it('같은 주면 카운트를 유지한다', () => {
      // 2026-02-17 is a Tuesday, week starts 2026-02-16 (Monday)
      const streak = new CommuteStreak(userId, {
        weeklyCount: 3,
        weekStartDate: '2026-02-16',
      });

      streak.ensureWeeklyCountCurrent('2026-02-17');

      expect(streak.weeklyCount).toBe(3);
    });

    it('새 주가 시작되면 카운트가 0으로 리셋된다', () => {
      const streak = new CommuteStreak(userId, {
        weeklyCount: 5,
        weekStartDate: '2026-02-09', // previous week
      });

      streak.ensureWeeklyCountCurrent('2026-02-17');

      expect(streak.weeklyCount).toBe(0);
      expect(streak.weekStartDate).toBe('2026-02-16'); // new week start
    });
  });
});
