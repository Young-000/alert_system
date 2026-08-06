import { describe, expect, it } from 'vitest';
import {
  formatTodayKST,
  getKstDayOfWeek,
  getTodayKstDayIndex,
} from './missions-date-utils';

/**
 * 백엔드는 미션 데이터를 전부 KST 기준으로 만든다
 * (`mission-stats.use-case.ts`의 todayKST, `kst-date.ts`).
 * 화면이 브라우저 로컬 시각으로 "오늘"을 계산하면 KST와 날짜가 갈리는 순간
 * 헤더의 날짜와 주간 그리드의 '오늘' 강조가 실제 데이터와 어긋난다.
 */
describe('missions-date-utils — KST 고정', () => {
  // 2026-08-01T23:00:00Z = KST 2026-08-02(일) 08:00
  const LATE_UTC = new Date('2026-08-01T23:00:00Z');
  // 2026-08-02T20:00:00Z = KST 2026-08-03(월) 05:00
  const MONDAY_KST = new Date('2026-08-02T20:00:00Z');

  it('UTC로는 전날이어도 KST 날짜를 표시한다', () => {
    expect(formatTodayKST(LATE_UTC)).toBe('8월 2일 (일)');
  });

  it('UTC로는 전날이어도 KST 요일 인덱스를 쓴다 (월=0)', () => {
    expect(getTodayKstDayIndex(LATE_UTC)).toBe(6); // 일요일
  });

  it('KST 월요일은 인덱스 0이다', () => {
    expect(getTodayKstDayIndex(MONDAY_KST)).toBe(0);
    expect(formatTodayKST(MONDAY_KST)).toBe('8월 3일 (월)');
  });

  it('KST 자정 직후에도 그날 날짜로 넘어간다', () => {
    // 2026-08-02T15:00:00Z = KST 2026-08-03(월) 00:00
    const kstMidnight = new Date('2026-08-02T15:00:00Z');
    expect(formatTodayKST(kstMidnight)).toBe('8월 3일 (월)');
    expect(getTodayKstDayIndex(kstMidnight)).toBe(0);
  });

  it('KST 자정 1분 전은 아직 전날이다', () => {
    // 2026-08-02T14:59:00Z = KST 2026-08-02(일) 23:59
    const justBefore = new Date('2026-08-02T14:59:00Z');
    expect(formatTodayKST(justBefore)).toBe('8월 2일 (일)');
    expect(getTodayKstDayIndex(justBefore)).toBe(6);
  });

  it('getKstDayOfWeek는 브라우저 TZ와 무관하게 날짜 문자열의 요일을 준다', () => {
    // 백엔드가 내려주는 날짜는 이미 KST 달력 날짜다.
    expect(getKstDayOfWeek('2026-08-03')).toBe(0); // 월
    expect(getKstDayOfWeek('2026-08-01')).toBe(5); // 토
    expect(getKstDayOfWeek('2026-08-02')).toBe(6); // 일
  });

  it('주간 그리드의 오늘 인덱스와 오늘 날짜의 요일 인덱스가 일치한다', () => {
    // 두 함수가 서로 다른 기준을 쓰면 '오늘' 강조가 데이터와 어긋난다.
    expect(getTodayKstDayIndex(LATE_UTC)).toBe(getKstDayOfWeek('2026-08-02'));
    expect(getTodayKstDayIndex(MONDAY_KST)).toBe(getKstDayOfWeek('2026-08-03'));
  });
});
