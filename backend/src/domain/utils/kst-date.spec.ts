import { getWeekStartKST, subtractDays } from './kst-date';

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
});
