import {
  getWeekStartKST,
  subtractDays,
  addDays,
  getWeekBounds,
  formatWeekLabel,
  toDateKST,
} from './kst-date';

describe('KST Date Utilities', () => {
  describe('subtractDays', () => {
    it('1일을 뺀다', () => {
      expect(subtractDays('2026-02-17', 1)).toBe('2026-02-16');
    });

    it('월 경계를 넘는다', () => {
      expect(subtractDays('2026-03-01', 1)).toBe('2026-02-28');
    });

    it('7일을 뺀다', () => {
      expect(subtractDays('2026-02-17', 7)).toBe('2026-02-10');
    });
  });

  describe('getWeekStartKST', () => {
    it('화요일의 주 시작은 월요일이다', () => {
      // 2026-02-17 is Tuesday
      expect(getWeekStartKST('2026-02-17')).toBe('2026-02-16');
    });

    it('월요일의 주 시작은 자기 자신이다', () => {
      expect(getWeekStartKST('2026-02-16')).toBe('2026-02-16');
    });

    it('일요일의 주 시작은 이전 월요일이다', () => {
      // 2026-02-22 is Sunday
      expect(getWeekStartKST('2026-02-22')).toBe('2026-02-16');
    });

    it('토요일의 주 시작은 이전 월요일이다', () => {
      // 2026-02-21 is Saturday
      expect(getWeekStartKST('2026-02-21')).toBe('2026-02-16');
    });
  });

  describe('addDays', () => {
    it('6일을 더한다', () => {
      expect(addDays('2026-02-16', 6)).toBe('2026-02-22');
    });

    it('월 경계를 넘는다', () => {
      expect(addDays('2026-02-27', 5)).toBe('2026-03-04');
    });

    it('0일을 더하면 같은 날이다', () => {
      expect(addDays('2026-02-17', 0)).toBe('2026-02-17');
    });

    it('연도 경계를 넘는다', () => {
      expect(addDays('2025-12-29', 7)).toBe('2026-01-05');
    });
  });

  describe('getWeekBounds', () => {
    // 2026-02-17 is Tuesday, current week starts on Monday 2026-02-16
    const today = '2026-02-17';

    it('weekOffset=0이면 이번 주 월~일을 반환한다', () => {
      const { weekStart, weekEnd } = getWeekBounds(today, 0);
      expect(weekStart).toBe('2026-02-16'); // Monday
      expect(weekEnd).toBe('2026-02-22');   // Sunday
    });

    it('weekOffset=1이면 지난주 월~일을 반환한다', () => {
      const { weekStart, weekEnd } = getWeekBounds(today, 1);
      expect(weekStart).toBe('2026-02-09');
      expect(weekEnd).toBe('2026-02-15');
    });

    it('weekOffset=2이면 2주 전 월~일을 반환한다', () => {
      const { weekStart, weekEnd } = getWeekBounds(today, 2);
      expect(weekStart).toBe('2026-02-02');
      expect(weekEnd).toBe('2026-02-08');
    });

    it('weekOffset=4이면 4주 전 월~일을 반환한다', () => {
      const { weekStart, weekEnd } = getWeekBounds(today, 4);
      expect(weekStart).toBe('2026-01-19');
      expect(weekEnd).toBe('2026-01-25');
    });

    it('월요일 기준으로 호출해도 올바르게 동작한다', () => {
      const { weekStart, weekEnd } = getWeekBounds('2026-02-16', 0);
      expect(weekStart).toBe('2026-02-16');
      expect(weekEnd).toBe('2026-02-22');
    });

    it('일요일 기준으로 호출해도 올바르게 동작한다', () => {
      // Sunday 2026-02-22 belongs to the week starting 2026-02-16
      const { weekStart, weekEnd } = getWeekBounds('2026-02-22', 0);
      expect(weekStart).toBe('2026-02-16');
      expect(weekEnd).toBe('2026-02-22');
    });

    it('월 경계를 넘는 주에도 올바르게 동작한다', () => {
      // 2026-03-02 is Monday
      const { weekStart, weekEnd } = getWeekBounds('2026-03-03', 0);
      expect(weekStart).toBe('2026-03-02');
      expect(weekEnd).toBe('2026-03-08');
    });
  });

  describe('formatWeekLabel', () => {
    it('2월 첫째 주를 올바르게 표시한다', () => {
      expect(formatWeekLabel('2026-02-02')).toBe('2월 1주차');
    });

    it('2월 셋째 주를 올바르게 표시한다', () => {
      expect(formatWeekLabel('2026-02-16')).toBe('2월 3주차');
    });

    it('1월 마지막 주를 올바르게 표시한다', () => {
      expect(formatWeekLabel('2026-01-26')).toBe('1월 4주차');
    });

    it('월의 첫 번째 날이 월요일이면 1주차다', () => {
      // 2026-06-01 is Monday
      expect(formatWeekLabel('2026-06-01')).toBe('6월 1주차');
    });
  });

  describe('toDateKST', () => {
    it('시작 시간으로 변환한다 (기본값)', () => {
      const date = toDateKST('2026-02-16');
      // KST 00:00:00 = UTC-1 day 15:00:00
      expect(date.toISOString()).toBe('2026-02-15T15:00:00.000Z');
    });

    it('종료 시간으로 변환한다 (endOfDay=true)', () => {
      const date = toDateKST('2026-02-22', true);
      // KST 23:59:59 = UTC 14:59:59
      expect(date.toISOString()).toBe('2026-02-22T14:59:59.000Z');
    });

    it('다른 날짜도 올바르게 변환한다', () => {
      const date = toDateKST('2026-01-01');
      expect(date.toISOString()).toBe('2025-12-31T15:00:00.000Z');
    });
  });
});
