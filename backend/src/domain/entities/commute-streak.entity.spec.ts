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

    it('새 스트릭이 옛 기록을 넘으면 최고 기록 구간이 새 스트릭 구간으로 갱신된다', () => {
      // 옛 최고 기록: 2026-01-01 ~ 2026-01-10 (10일)
      // 새 스트릭: 2026-02-08 시작, 오늘로 11일째 → 최고 기록 경신
      const streak = new CommuteStreak(userId, {
        currentStreak: 10,
        bestStreak: 10,
        bestStreakStart: '2026-01-01',
        bestStreakEnd: '2026-01-10',
        lastRecordDate: '2026-02-17',
        streakStartDate: '2026-02-08',
      });

      streak.recordCompletion('2026-02-18');

      expect(streak.bestStreak).toBe(11);
      expect(streak.bestStreakEnd).toBe('2026-02-18');
      // 옛 스트릭의 시작일이 남아 있으면 최고 기록 구간이 40일짜리로 날조된다
      expect(streak.bestStreakStart).toBe('2026-02-08');
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

    it('14일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 13,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('14d');
      expect(streak.milestonesAchieved).toEqual(['7d', '14d']);
    });

    it('30일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 29,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d', '14d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('30d');
      expect(streak.milestonesAchieved).toEqual(['7d', '14d', '30d']);
    });

    it('60일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 59,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d', '14d', '30d'],
      });

      const result = streak.recordCompletion('2026-02-17');

      expect(result.milestoneAchieved).toBe('60d');
      expect(streak.milestonesAchieved).toEqual(['7d', '14d', '30d', '60d']);
    });

    it('100일 마일스톤을 달성한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 99,
        lastRecordDate: '2026-02-16',
        milestonesAchieved: ['7d', '14d', '30d', '60d'],
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

    it('어제까지 기록했고 오늘은 아직이면 at_risk 상태다', () => {
      // 스트릭은 살아 있지만 오늘 기록하지 않으면 끊긴다.
      // 프론트엔드가 이 값으로 "오늘 기록하면 스트릭 유지!" 경고를 띄운다
      // (StreakBadge.tsx:21,27,58 · WeeklyProgress.tsx:36).
      const streak = new CommuteStreak(userId, {
        lastRecordDate: '2026-02-16',
        currentStreak: 5,
      });
      expect(streak.getStatus('2026-02-17')).toBe('at_risk');
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

    it('7일을 달성하면 14일이 다음 목표다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 10,
        milestonesAchieved: ['7d'],
      });

      const next = streak.getNextMilestone();

      expect(next?.type).toBe('14d');
      expect(next?.daysRemaining).toBe(4);
    });

    it('14일을 달성하면 30일이 다음 목표다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 20,
        milestonesAchieved: ['7d', '14d'],
      });

      const next = streak.getNextMilestone();

      expect(next?.type).toBe('30d');
      expect(next?.daysRemaining).toBe(10);
    });

    it('모든 마일스톤을 달성하면 null을 반환한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 150,
        milestonesAchieved: ['7d', '14d', '30d', '60d', '100d'],
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

  describe('ensureStreakCurrent', () => {
    it('2일 이상 빠져 끊긴 스트릭은 0으로 리셋된다', () => {
      // lastRecordDate가 2일 이상 지나면 스트릭은 이미 끊겼다.
      // 다음 recordCompletion 전까지 저장된 currentStreak은 낡은 값이므로
      // 조회 시점에 바로잡지 않으면 "연속 12일"이 그대로 화면에 나간다.
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        streakStartDate: '2026-02-06',
        lastRecordDate: '2026-02-14',
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.currentStreak).toBe(0);
      expect(streak.streakStartDate).toBeNull();
    });

    it('끊겨도 최고 기록과 획득 배지는 보존한다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        bestStreak: 25,
        bestStreakStart: '2026-01-01',
        bestStreakEnd: '2026-01-25',
        lastRecordDate: '2026-02-14',
        milestonesAchieved: ['7d'],
        latestMilestone: '7d',
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.bestStreak).toBe(25);
      expect(streak.bestStreakStart).toBe('2026-01-01');
      expect(streak.bestStreakEnd).toBe('2026-01-25');
      expect(streak.milestonesAchieved).toEqual(['7d']);
      expect(streak.latestMilestone).toBe('7d');
    });

    it('리셋 후에도 broken 상태 판정은 유지된다', () => {
      // lastRecordDate를 지우면 'new'로 바뀌어 "첫 기록을 시작하세요"가 뜬다.
      // 끊긴 사용자에게는 "다시 시작해보세요"가 맞다.
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        lastRecordDate: '2026-02-14',
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.getStatus('2026-02-17')).toBe('broken');
    });

    it('끊긴 스트릭의 다음 마일스톤은 처음부터 다시 센다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        lastRecordDate: '2026-02-14',
        milestonesAchieved: ['7d'],
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.getNextMilestone()).toEqual({
        type: '14d',
        label: '14일 연속',
        daysRemaining: 14,
        progress: 0,
      });
    });

    it('오늘 기록한 살아 있는 스트릭은 건드리지 않는다', () => {
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        streakStartDate: '2026-02-06',
        lastRecordDate: '2026-02-17',
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.currentStreak).toBe(12);
      expect(streak.streakStartDate).toBe('2026-02-06');
    });

    it('어제까지 기록한 at_risk 스트릭은 건드리지 않는다', () => {
      // 아직 살아 있다 — 오늘 기록하면 이어진다.
      const streak = new CommuteStreak(userId, {
        currentStreak: 12,
        streakStartDate: '2026-02-06',
        lastRecordDate: '2026-02-16',
      });

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.currentStreak).toBe(12);
      expect(streak.streakStartDate).toBe('2026-02-06');
    });

    it('기록이 없는 신규 사용자는 그대로 둔다', () => {
      const streak = CommuteStreak.createNew(userId);

      streak.ensureStreakCurrent('2026-02-17');

      expect(streak.currentStreak).toBe(0);
      expect(streak.getStatus('2026-02-17')).toBe('new');
    });
  });
});
