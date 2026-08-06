import { computeNextAlert } from './alert-schedule-utils';
import type { Alert } from '@infrastructure/api';

function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: 'Test Alert',
    schedule: '0 8 * * *',
    alertTypes: ['weather'],
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Alert;
}

describe('computeNextAlert', () => {
  it('returns null for empty alerts array', () => {
    expect(computeNextAlert([])).toBeNull();
  });

  it('returns null when all alerts are disabled', () => {
    const alerts = [buildAlert({ enabled: false })];
    expect(computeNextAlert(alerts)).toBeNull();
  });

  it('returns today time when alert is in the future', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [buildAlert({ schedule: '30 8 * * *' })]; // 8:30
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:30', label: '날씨' });
  });

  it('returns "내일" prefix when alert is in the past today', () => {
    const now = new Date(2026, 1, 17, 10, 0); // 10:00 AM
    const alerts = [buildAlert({ schedule: '0 8 * * *' })]; // 8:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '내일 08:00', label: '날씨' });
  });

  it('picks the nearest future alert from multiple alerts', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 18 * * *', alertTypes: ['bus'] }), // 18:00 교통
      buildAlert({ id: 'a2', schedule: '30 7 * * *', alertTypes: ['weather'] }), // 07:30 날씨
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '07:30', label: '날씨' });
  });

  it('handles comma-separated hours in schedule', () => {
    const now = new Date(2026, 1, 17, 9, 0); // 9:00 AM
    const alerts = [buildAlert({ schedule: '0 8,12,18 * * *' })]; // 8:00, 12:00, 18:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '12:00', label: '날씨' });
  });

  it('returns 교통 label for non-weather alert types', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '0 8 * * *', alertTypes: ['bus', 'subway'] })];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '교통' });
  });

  it('prefers today alert over tomorrow alert', () => {
    const now = new Date(2026, 1, 17, 12, 0); // noon
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 7 * * *' }),  // 7:00 (past today → tomorrow)
      buildAlert({ id: 'a2', schedule: '0 14 * * *' }), // 14:00 (future today)
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '14:00', label: '날씨' });
  });

  it('handles non-numeric cron minute gracefully', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '* 8 * * *' })]; // '*' minute → defaults to 0
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '날씨' });
  });

  it('skips alerts with less than 2 schedule parts', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '30' })]; // invalid
    expect(computeNextAlert(alerts, now)).toBeNull();
  });

  it('pads single-digit hours and minutes', () => {
    const now = new Date(2026, 1, 17, 5, 0);
    const alerts = [buildAlert({ schedule: '5 6 * * *' })]; // 6:05
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '06:05', label: '날씨' });
  });

  // ── cron 요일 필드 반영 ──
  // EventBridge는 요일을 그대로 실제 스케줄로 옮긴다. 요일을 무시하면
  // 홈 화면이 "발화하지 않는 날"을 다음 알림으로 단언하게 된다.
  describe('day-of-week 필드', () => {
    const SATURDAY_10AM = new Date(2026, 7, 1, 10, 0); // 2026-08-01 (토) 10:00
    const MONDAY_7AM = new Date(2026, 7, 3, 7, 0); // 2026-08-03 (월) 07:00

    it('평일 전용 알림은 토요일에 "내일"(일요일)이라 하지 않는다', () => {
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, SATURDAY_10AM);
      expect(result).toEqual({ time: '월 08:00', label: '날씨' });
    });

    it('주말 전용 알림은 월요일에 오늘이라 하지 않는다', () => {
      const alerts = [buildAlert({ schedule: '0 9 * * 0,6' })];
      const result = computeNextAlert(alerts, MONDAY_7AM);
      expect(result).toEqual({ time: '토 09:00', label: '날씨' });
    });

    it('평일 알림은 평일 아침이면 오늘로 표시한다', () => {
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, MONDAY_7AM);
      expect(result).toEqual({ time: '08:00', label: '날씨' });
    });

    it('평일 알림은 금요일 저녁이면 다음 발화가 월요일이다', () => {
      const fridayEvening = new Date(2026, 7, 7, 20, 0); // 2026-08-07 (금) 20:00
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, fridayEvening);
      expect(result).toEqual({ time: '월 08:00', label: '날씨' });
    });

    it('요일이 다른 알림들 중 실제로 가장 먼저 발화하는 것을 고른다', () => {
      const alerts = [
        buildAlert({ id: 'a1', schedule: '0 7 * * 1-5', alertTypes: ['weather'] }), // → 월 07:00
        buildAlert({ id: 'a2', schedule: '0 18 * * 0,6', alertTypes: ['bus'] }), // → 오늘(토) 18:00
      ];
      const result = computeNextAlert(alerts, SATURDAY_10AM);
      expect(result).toEqual({ time: '18:00', label: '교통' });
    });
  });
});
