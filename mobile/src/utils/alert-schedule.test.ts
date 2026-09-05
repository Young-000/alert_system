import { describe, expect, it } from 'vitest';

import { computeNextAlert } from './alert-schedule';

import type { Alert } from '@/types/home';

function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: '출근 알림',
    schedule: '0 8 * * *',
    alertTypes: ['weather'],
    enabled: true,
    ...overrides,
  };
}

const MONDAY_7AM = new Date(2026, 7, 3, 7, 0); // 2026-08-03 (월) 07:00
const SATURDAY_10AM = new Date(2026, 7, 1, 10, 0); // 2026-08-01 (토) 10:00

describe('computeNextAlert', () => {
  it('알림이 없으면 null', () => {
    expect(computeNextAlert([])).toBeNull();
  });

  it('꺼진 알림만 있으면 null', () => {
    expect(computeNextAlert([buildAlert({ enabled: false })])).toBeNull();
  });

  it('오늘 아직 남은 시각은 시각만 보여준다', () => {
    const result = computeNextAlert([buildAlert({ schedule: '30 8 * * *' })], MONDAY_7AM);
    expect(result).toEqual({ time: '08:30', label: '날씨 + 교통 알림' });
  });

  it('오늘 시각이 지났으면 "내일"을 붙인다', () => {
    const mondayEvening = new Date(2026, 7, 3, 20, 0);
    const result = computeNextAlert([buildAlert({ schedule: '0 8 * * *' })], mondayEvening);
    expect(result).toEqual({ time: '내일 08:00', label: '날씨 + 교통 알림' });
  });

  it('평일 전용 알림은 토요일에 "내일"(일요일)이라 하지 않는다', () => {
    const result = computeNextAlert([buildAlert({ schedule: '0 8 * * 1-5' })], SATURDAY_10AM);
    expect(result).toEqual({ time: '월 08:00', label: '날씨 + 교통 알림' });
  });

  it('교통 전용 알림은 라벨이 다르다', () => {
    const result = computeNextAlert(
      [buildAlert({ schedule: '30 8 * * *', alertTypes: ['bus'] })],
      MONDAY_7AM,
    );
    expect(result).toEqual({ time: '08:30', label: '교통 알림' });
  });

  it('여러 시각 중 가장 먼저 발화하는 것을 고른다', () => {
    const result = computeNextAlert([buildAlert({ schedule: '0 7,18 * * *' })], MONDAY_7AM);
    expect(result).toEqual({ time: '18:00', label: '날씨 + 교통 알림' });
  });

  it('시각 필드를 숫자로 읽을 수 없는 알림은 건너뛴다', () => {
    const result = computeNextAlert([buildAlert({ schedule: '0 */2 * * *' })], MONDAY_7AM);
    expect(result).toBeNull();
  });

  it('주 1회 알림은 그날 시각이 지나도 다음 주 발화를 알려준다', () => {
    // '0 8 * * 1' = 월요일에만 울리는 알림. 월요일 09:00에는 오늘 발화가 끝났고
    // 다음 발화는 7일 뒤다. offset 6까지만 훑으면 후보가 없어 null이 되고,
    // 홈 화면의 "다음 알림"이 통째로 사라진다.
    const mondayAfterAlert = new Date(2026, 7, 3, 9, 0);
    const result = computeNextAlert([buildAlert({ schedule: '0 8 * * 1' })], mondayAfterAlert);
    expect(result).toEqual({ time: '다음 주 월 08:00', label: '날씨 + 교통 알림' });
  });
});
