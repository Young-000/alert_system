import { DailyMissionRecord } from './daily-mission-record.entity';

describe('DailyMissionRecord', () => {
  describe('createForToday', () => {
    it('오늘 날짜로 미완료 상태의 레코드를 생성한다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      expect(record.userId).toBe('user-1');
      expect(record.missionId).toBe('mission-1');
      expect(record.date).toBe('2026-02-25');
      expect(record.isCompleted).toBe(false);
      expect(record.completedAt).toBeNull();
    });
  });

  describe('toggleCheck', () => {
    it('미완료 → 완료로 토글하면 completedAt이 설정된다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      record.toggleCheck();
      expect(record.isCompleted).toBe(true);
      expect(record.completedAt).toBeInstanceOf(Date);
    });

    it('완료 → 미완료로 토글하면 completedAt이 null이 된다', () => {
      const record = DailyMissionRecord.createForToday('user-1', 'mission-1', '2026-02-25');
      record.toggleCheck(); // complete
      record.toggleCheck(); // uncomplete
      expect(record.isCompleted).toBe(false);
      expect(record.completedAt).toBeNull();
    });
  });
});
