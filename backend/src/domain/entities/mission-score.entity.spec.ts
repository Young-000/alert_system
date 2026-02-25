import { MissionScore } from './mission-score.entity';

describe('MissionScore', () => {
  describe('calculate', () => {
    it('달성률을 계산한다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 5, 3, 4);
      expect(score.userId).toBe('user-1');
      expect(score.date).toBe('2026-02-25');
      expect(score.totalMissions).toBe(5);
      expect(score.completedMissions).toBe(3);
      expect(score.completionRate).toBe(60);
      expect(score.streakDay).toBe(0); // 60% != 100% → streak reset
      expect(score.id).toBeDefined();
    });

    it('미션이 0개면 달성률 0이다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 0, 0, 0);
      expect(score.completionRate).toBe(0);
      expect(score.streakDay).toBe(0);
    });

    it('100% 달성이면 달성률 100이고 스트릭 증가한다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 4, 4, 10);
      expect(score.completionRate).toBe(100);
      expect(score.streakDay).toBe(11); // 100% → previousStreak + 1
    });

    it('100% 미달성이면 스트릭이 리셋된다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 5, 4, 7);
      expect(score.completionRate).toBe(80);
      expect(score.streakDay).toBe(0); // 80% != 100% → reset
    });

    it('소수점 달성률을 반올림한다', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 3, 1, 0);
      expect(score.completionRate).toBe(33); // 33.33... → 33
    });
  });

  describe('isPerfect', () => {
    it('100% 달성이면 true', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 3, 3, 1);
      expect(score.isPerfect()).toBe(true);
    });

    it('미달성이면 false', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 3, 2, 0);
      expect(score.isPerfect()).toBe(false);
    });

    it('미션이 0개면 false', () => {
      const score = MissionScore.calculate('user-1', '2026-02-25', 0, 0, 0);
      expect(score.isPerfect()).toBe(false);
    });
  });
});
